import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ResizeMode, Video } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import {
  endpoints,
  fetchMovies,
  fetchMovieTrailer,
  IMAGE_BASE_URL,
  ORIGINAL_IMAGE_URL,
} from "../services/tmdb";

const { width, height } = Dimensions.get("window");
const API_KEY = "ddf5724768b00aee5a7630ebe654913d";

const GENRES = [
  { id: null, name: "All" },
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 878, name: "Sci-Fi" },
  { id: 27, name: "Horror" },
  { id: 16, name: "Animation" },
];

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <ActivityIndicator size="small" color="#444444" />
  </View>
);

const MovieCard = React.memo(
  ({
    item,
    onSelect,
    isSearch = false,
    progress,
    onToggleBookmark,
    isBookmarked,
  }: {
    item: any;
    onSelect: (item: any) => void;
    isSearch?: boolean;
    progress?: number;
    onToggleBookmark?: (item: any) => void;
    isBookmarked?: boolean;
  }) => (
    <TouchableOpacity
      style={isSearch ? styles.searchCard : styles.cardContainer}
      activeOpacity={0.7}
      onPress={() => onSelect(item)}
    >
      <Image
        source={{
          uri: item.poster_path
            ? `${IMAGE_BASE_URL}${item.poster_path}`
            : "https://via.placeholder.com/150x225/222/fff?text=No+Image",
        }}
        style={isSearch ? styles.searchPoster : styles.posterImage}
      />
      {onToggleBookmark && (
        <TouchableOpacity
          style={styles.quickBookmarkBtn}
          onPress={(e) => {
            e.stopPropagation();
            onToggleBookmark(item);
          }}
        >
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={16}
            color={isBookmarked ? "#E50914" : "#FFFFFF"}
          />
        </TouchableOpacity>
      )}
      {progress !== undefined && (
        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
          />
        </View>
      )}
    </TouchableOpacity>
  ),
);

const MovieRow = React.memo(
  ({
    title,
    data,
    onSelectMovie,
    getProgress,
    myList,
    onToggleBookmark,
  }: {
    title: string;
    data: any[];
    onSelectMovie: (movie: any) => void;
    getProgress?: (id: number) => number | undefined;
    myList?: any[];
    onToggleBookmark?: (movie: any) => void;
  }) => {
    const flatListRef = useRef<FlatList>(null);
    const scrollOffset = useRef(0);

    const handleScroll = (direction: "left" | "right") => {
      const scrollAmount = 400;
      const newOffset =
        direction === "left"
          ? Math.max(0, scrollOffset.current - scrollAmount)
          : scrollOffset.current + scrollAmount;

      flatListRef.current?.scrollToOffset({
        offset: newOffset,
        animated: true,
      });
      scrollOffset.current = newOffset;
    };

    const renderItem = useCallback(
      ({ item }: { item: any }) => (
        <MovieCard
          item={item}
          onSelect={onSelectMovie}
          progress={getProgress ? getProgress(item.id) : undefined}
          onToggleBookmark={onToggleBookmark}
          isBookmarked={myList?.some((m) => m.id === item.id)}
        />
      ),
      [onSelectMovie, getProgress, myList, onToggleBookmark],
    );

    if (!data || data.length === 0) return null;

    return (
      <View style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>{title}</Text>
        <View style={styles.carouselRowWrapper}>
          <TouchableOpacity
            style={[styles.scrollArrowBtn, styles.leftArrowBtn]}
            onPress={() => handleScroll("left")}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <FlatList
            ref={flatListRef}
            data={data}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              scrollOffset.current = e.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={32}
            keyExtractor={(item: any, index: number) => `${item.id}-${index}`}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={renderItem}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={3}
            removeClippedSubviews={Platform.OS !== "web"}
          />

          <TouchableOpacity
            style={[styles.scrollArrowBtn, styles.rightArrowBtn]}
            onPress={() => handleScroll("right")}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

export default function HomeScreen() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroMovies, setHeroMovies] = useState<any[]>([]);
  const [heroMovie, setHeroMovie] = useState<any>(null);
  const [heroTrailerKey, setHeroTrailerKey] = useState<string | null>(null);

  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [action, setAction] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Switcher State
  const [currentProfile, setCurrentProfile] = useState<"Main" | "Kids">("Main");

  // Auth & Profile State
  const [userAccount, setUserAccount] = useState<{ email: string } | null>(
    null,
  );
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [pendingMovieToWatch, setPendingMovieToWatch] = useState<any>(null);

  // Profile Features Modals
  const [myListModalVisible, setMyListModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Settings State
  const [videoQuality, setVideoQuality] = useState("Auto");
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  const [myList, setMyList] = useState<any[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);

  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [genreMovies, setGenreMovies] = useState<any[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);

  // Search & Advanced Filter State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"popularity" | "rating" | "release">(
    "popularity",
  );
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState(0);

  // Movie Details Modal
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [director, setDirector] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [cast, setCast] = useState<{ id: number; name: string }[]>([]);
  const [similarMovies, setSimilarMovies] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);

  // Person Bio Modal
  const [personModalVisible, setPersonModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<{
    id: number;
    name: string;
    role: string;
    bio?: string;
    profilePath?: string;
  } | null>(null);
  const [personMovies, setPersonMovies] = useState<any[]>([]);
  const [personLoading, setPersonLoading] = useState(false);

  // Player & PiP Mode State
  const [playingMovie, setPlayingMovie] = useState<any>(null);
  const [isPipMode, setIsPipMode] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState("Original (English)");
  const [selectedSubtitle, setSelectedSubtitle] = useState("English [CC]");

  useEffect(() => {
    async function loadData() {
      const [trendingData, topRatedData, actionData] = await Promise.all([
        fetchMovies(endpoints.trending),
        fetchMovies(endpoints.topRated),
        fetchMovies(endpoints.action),
      ]);

      setTrending(trendingData);
      setTopRated(topRatedData);
      setAction(actionData);

      if (trendingData.length > 0) {
        const validHeroMovies = trendingData.filter(
          (m: any) => m.backdrop_path || m.poster_path,
        );
        setHeroMovies(validHeroMovies);
        setHeroMovie(validHeroMovies[0]);
      }

      await loadStoredData();
      setLoading(false);
    }

    loadData();
  }, []);

  // AUTO-NEXT BANNER EFFECT (Magpapalit bawat 6 seconds)
  useEffect(() => {
    if (heroMovies.length === 0 || playingMovie || selectedMovie) return;

    const interval = setInterval(() => {
      setHeroIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % Math.min(heroMovies.length, 8);
        return nextIndex;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [heroMovies, playingMovie, selectedMovie]);

  // Sync index change to active hero movie & trailer fetch
  useEffect(() => {
    if (heroMovies.length > 0) {
      const current = heroMovies[heroIndex];
      setHeroMovie(current);
      setHeroTrailerKey(null);
      fetchMovieTrailer(current.id).then((key) => setHeroTrailerKey(key));
    }
  }, [heroIndex, heroMovies]);

  const loadStoredData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("@zpk_user_account");
      const storedList = await AsyncStorage.getItem("@zpk_mylist");
      const storedContinue = await AsyncStorage.getItem(
        "@zpk_continue_watching",
      );

      if (storedUser) setUserAccount(JSON.parse(storedUser));
      if (storedList) setMyList(JSON.parse(storedList));
      if (storedContinue) setContinueWatching(JSON.parse(storedContinue));
    } catch (e) {
      console.error("Failed to load storage:", e);
    }
  };

  const handleSaveAccount = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      if (Platform.OS === "web") alert("Please enter both email and password.");
      else Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    const userData = { email: authEmail.trim() };
    setUserAccount(userData);
    await AsyncStorage.setItem("@zpk_user_account", JSON.stringify(userData));

    setAuthModalVisible(false);
    setAuthEmail("");
    setAuthPassword("");

    if (pendingMovieToWatch) {
      startVideoPlayer(pendingMovieToWatch);
      setPendingMovieToWatch(null);
    }
  };

  const handleLogout = () => {
    const doLogout = async () => {
      setUserAccount(null);
      await AsyncStorage.removeItem("@zpk_user_account");
    };

    if (Platform.OS === "web") {
      if (confirm("Are you sure you want to sign out?")) doLogout();
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out of ZPK-MAX?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const handleClearCache = async () => {
    try {
      await AsyncStorage.removeItem("@zpk_continue_watching");
      setContinueWatching([]);
      if (Platform.OS === "web") alert("App cache and watch history cleared!");
      else Alert.alert("Success", "App cache and watch history cleared!");
    } catch (e) {
      console.error("Clear cache error:", e);
    }
  };

  const handleStartWatching = (movie: any) => {
    if (!userAccount) {
      setPendingMovieToWatch(movie);
      setAuthModalVisible(true);
      return;
    }
    startVideoPlayer(movie);
  };

  const startVideoPlayer = async (movie: any) => {
    try {
      let updated = [...continueWatching];
      const existingIndex = updated.findIndex((m) => m.id === movie.id);

      const movieItem = {
        ...movie,
        progress:
          existingIndex >= 0
            ? updated[existingIndex].progress
            : Math.random() * 0.4 + 0.2,
      };

      if (existingIndex >= 0) updated.splice(existingIndex, 1);
      updated.unshift(movieItem);

      setContinueWatching(updated);
      await AsyncStorage.setItem(
        "@zpk_continue_watching",
        JSON.stringify(updated),
      );

      setSelectedMovie(null);
      setIsPipMode(false);
      setPlayingMovie(movie);
    } catch (e) {
      console.error("Failed to update continue watching:", e);
    }
  };

  const toggleMyList = async (movie: any) => {
    try {
      let updatedList = [...myList];
      const exists = updatedList.some((m) => m.id === movie.id);
      if (exists) {
        updatedList = updatedList.filter((m) => m.id !== movie.id);
      } else {
        updatedList.push(movie);
      }
      setMyList(updatedList);
      await AsyncStorage.setItem("@zpk_mylist", JSON.stringify(updatedList));
    } catch (e) {
      console.error("Failed to update My List:", e);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(searchQuery)}&page=1`,
        );
        const validMovies = response.data.results.filter(
          (m: any) => m.poster_path,
        );
        setSearchResults(validMovies);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getFilteredSearchResults = () => {
    let list = [...searchResults];
    if (minRatingFilter > 0) {
      list = list.filter((m) => (m.vote_average || 0) >= minRatingFilter);
    }
    if (sortBy === "rating") {
      return list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    }
    if (sortBy === "release") {
      return list.sort((a, b) => {
        const yearA = parseInt(a.release_date?.split("-")[0] || "0");
        const yearB = parseInt(b.release_date?.split("-")[0] || "0");
        return yearB - yearA;
      });
    }
    return list;
  };

  const handleSelectGenre = async (genreId: number | null) => {
    setSelectedGenre(genreId);
    if (!genreId) {
      setGenreMovies([]);
      return;
    }
    setGenreLoading(true);
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&page=1`,
      );
      setGenreMovies(response.data.results || []);
    } catch (error) {
      console.error("Genre fetch error:", error);
    } finally {
      setGenreLoading(false);
    }
  };

  const handleSelectMovie = useCallback(async (movie: any) => {
    setSelectedMovie(movie);
    setTrailerKey(null);
    setDirector(null);
    setCast([]);
    setSimilarMovies([]);
    setSelectedSeason(1);

    fetchMovieTrailer(movie.id).then((key) => setTrailerKey(key));

    axios
      .get(
        `https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${API_KEY}`,
      )
      .then((res) => {
        const crew = res.data.crew || [];
        const castList = res.data.cast || [];
        const dirObj = crew.find((member: any) => member.job === "Director");
        if (dirObj) setDirector({ id: dirObj.id, name: dirObj.name });
        setCast(
          castList.slice(0, 5).map((c: any) => ({ id: c.id, name: c.name })),
        );
      })
      .catch((err) => console.error("Credits error:", err));

    axios
      .get(
        `https://api.themoviedb.org/3/movie/${movie.id}/similar?api_key=${API_KEY}`,
      )
      .then((res) =>
        setSimilarMovies(
          (res.data.results || []).filter((m: any) => m.poster_path),
        ),
      )
      .catch((err) => console.error("Similar error:", err));
  }, []);

  const handleSelectPerson = async (id: number, name: string, role: string) => {
    setSelectedMovie(null);
    setSelectedPerson({ id, name, role });
    setPersonModalVisible(true);
    setPersonLoading(true);
    try {
      const [creditsRes, detailRes] = await Promise.all([
        axios.get(
          `https://api.themoviedb.org/3/person/${id}/movie_credits?api_key=${API_KEY}`,
        ),
        axios.get(
          `https://api.themoviedb.org/3/person/${id}?api_key=${API_KEY}`,
        ),
      ]);

      const movies =
        (role === "Director" ? creditsRes.data.crew : creditsRes.data.cast) ||
        [];
      setPersonMovies(movies.filter((m: any) => m.poster_path).slice(0, 18));
      setSelectedPerson({
        id,
        name,
        role,
        bio:
          detailRes.data.biography || "No biography available for this artist.",
        profilePath: detailRes.data.profile_path,
      });
    } catch (e) {
      console.error("Person details error:", e);
    } finally {
      setPersonLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  const isSelectedInMyList =
    selectedMovie && myList.some((m) => m.id === selectedMovie.id);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#141414" />

      <View style={styles.mainContentWrapper}>
        <View style={styles.topHeader}>
          {!isSearching ? (
            <>
              <TouchableOpacity
                style={styles.searchIconButton}
                onPress={() => setIsSearching(true)}
              >
                <Ionicons name="search" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.logoText}>ZPK-MAX</Text>

              {userAccount ? (
                <TouchableOpacity
                  style={styles.userBadge}
                  onPress={() => setProfileMenuVisible(true)}
                >
                  <Ionicons
                    name="person-circle"
                    size={30}
                    color={currentProfile === "Kids" ? "#FFB800" : "#E50914"}
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.headerLoginBtn}
                  onPress={() => setAuthModalVisible(true)}
                >
                  <Text style={styles.headerLoginText}>Sign In</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.searchBarActive}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#AAAAAA"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search movies..."
                placeholderTextColor="#8C8C8C"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity
                onPress={() => setFilterModalVisible(true)}
                style={{ marginRight: 8 }}
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={minRatingFilter > 0 ? "#E50914" : "#AAAAAA"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsSearching(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#AAAAAA" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!isSearching && (
          <View style={styles.genreBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
            >
              {GENRES.map((genre) => (
                <TouchableOpacity
                  key={genre.name}
                  style={[
                    styles.genrePill,
                    selectedGenre === genre.id && styles.genrePillSelected,
                  ]}
                  onPress={() => handleSelectGenre(genre.id)}
                >
                  <Text
                    style={[
                      styles.genrePillText,
                      selectedGenre === genre.id &&
                        styles.genrePillTextSelected,
                    ]}
                  >
                    {genre.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {isSearching && searchQuery.length > 0 ? (
          <View style={styles.searchResultsContainer}>
            <View style={styles.filterBar}>
              <Text style={styles.filterLabel}>Sort:</Text>
              {(["popularity", "rating", "release"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.filterChip,
                    sortBy === mode && styles.filterChipActive,
                  ]}
                  onPress={() => setSortBy(mode)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      sortBy === mode && styles.filterChipTextActive,
                    ]}
                  >
                    {mode === "popularity"
                      ? "Popular"
                      : mode === "rating"
                        ? "Rating ⭐"
                        : "Year 📅"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {searchLoading ? (
              <View style={styles.skeletonGrid}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={getFilteredSearchResults()}
                numColumns={6}
                keyExtractor={(item: any, index: number) =>
                  `${item.id}-${index}`
                }
                contentContainerStyle={{ padding: 10 }}
                renderItem={({ item }: { item: any }) => (
                  <MovieCard
                    item={item}
                    onSelect={handleSelectMovie}
                    isSearch
                    onToggleBookmark={toggleMyList}
                    isBookmarked={myList.some((m) => m.id === item.id)}
                  />
                )}
              />
            ) : (
              <Text style={styles.noResultsText}>
                No movies found for "{searchQuery}"
              </Text>
            )}
          </View>
        ) : selectedGenre ? (
          <View style={styles.searchResultsContainer}>
            {genreLoading ? (
              <View style={styles.skeletonGrid}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </View>
            ) : (
              <FlatList
                data={genreMovies}
                numColumns={6}
                keyExtractor={(item: any, index: number) =>
                  `${item.id}-${index}`
                }
                contentContainerStyle={{ padding: 10 }}
                renderItem={({ item }: { item: any }) => (
                  <MovieCard
                    item={item}
                    onSelect={handleSelectMovie}
                    isSearch
                    onToggleBookmark={toggleMyList}
                    isBookmarked={myList.some((m) => m.id === item.id)}
                  />
                )}
              />
            )}
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {heroMovie && (
              <View style={styles.heroContainer}>
                {heroTrailerKey ? (
                  <View style={styles.heroTrailerWrapper}>
                    {Platform.OS === "web" ? (
                      <iframe
                        key={heroMovie.id}
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${heroTrailerKey}?autoplay=1&mute=1&controls=0&loop=1`}
                        frameBorder="0"
                        allow="autoplay"
                      />
                    ) : (
                      <YoutubePlayer
                        height={350}
                        play={true}
                        videoId={heroTrailerKey}
                        mute={true}
                      />
                    )}
                  </View>
                ) : (
                  <Image
                    source={{
                      uri: `${ORIGINAL_IMAGE_URL}${heroMovie.backdrop_path || heroMovie.poster_path}`,
                    }}
                    style={styles.heroImage}
                  />
                )}
                <View style={styles.heroOverlay} />
                <View style={styles.heroContent}>
                  <Text style={styles.heroTitle} numberOfLines={1}>
                    {heroMovie.title || heroMovie.name}
                  </Text>

                  {/* Indicator Dots for Auto-next */}
                  <View style={styles.indicatorContainer}>
                    {heroMovies.slice(0, 8).map((_, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.indicatorDot,
                          heroIndex === idx && styles.indicatorDotActive,
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.heroButtonsRow}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => handleSelectMovie(heroMovie)}
                    >
                      <Ionicons name="play" size={18} color="#000000" />
                      <Text style={styles.playText}>Play</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {continueWatching.length > 0 && (
              <MovieRow
                title="Continue Watching"
                data={continueWatching}
                onSelectMovie={handleSelectMovie}
                getProgress={(id) =>
                  continueWatching.find((m) => m.id === id)?.progress
                }
                myList={myList}
                onToggleBookmark={toggleMyList}
              />
            )}

            {myList.length > 0 && (
              <MovieRow
                title="My List"
                data={myList}
                onSelectMovie={handleSelectMovie}
                myList={myList}
                onToggleBookmark={toggleMyList}
              />
            )}

            <MovieRow
              title="Trending Now"
              data={trending}
              onSelectMovie={handleSelectMovie}
              myList={myList}
              onToggleBookmark={toggleMyList}
            />
            <MovieRow
              title="Top Rated"
              data={topRated}
              onSelectMovie={handleSelectMovie}
              myList={myList}
              onToggleBookmark={toggleMyList}
            />
            <MovieRow
              title="Action Thrillers"
              data={action}
              onSelectMovie={handleSelectMovie}
              myList={myList}
              onToggleBookmark={toggleMyList}
            />
          </ScrollView>
        )}
      </View>

      {/* FILTER MODAL */}
      <Modal
        visible={filterModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlayCenter}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable
            style={styles.authModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.authTitle}>Filter Results</Text>

            <Text style={styles.settingLabel}>
              Minimum Rating: {minRatingFilter} ⭐
            </Text>
            <View style={styles.qualityRow}>
              {[0, 5, 7, 8].map((stars) => (
                <TouchableOpacity
                  key={stars}
                  style={[
                    styles.qualityChip,
                    minRatingFilter === stars && styles.qualityChipActive,
                  ]}
                  onPress={() => setMinRatingFilter(stars)}
                >
                  <Text
                    style={[
                      styles.qualityChipText,
                      minRatingFilter === stars && styles.qualityChipTextActive,
                    ]}
                  >
                    {stars === 0 ? "All" : `${stars}+ Stars`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.authSubmitBtn, { marginTop: 16 }]}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.authSubmitText}>Apply Filters</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MOVIE DETAILS MODAL */}
      <Modal
        visible={selectedMovie !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMovie(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedMovie(null)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedMovie(null)}
            >
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {selectedMovie && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.videoWrapper}>
                  {trailerKey ? (
                    Platform.OS === "web" ? (
                      <iframe
                        width="100%"
                        height="220"
                        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      />
                    ) : (
                      <YoutubePlayer
                        height={220}
                        play={true}
                        videoId={trailerKey}
                      />
                    )
                  ) : (
                    <View style={styles.noTrailerContainer}>
                      <ActivityIndicator size="small" color="#E50914" />
                      <Text style={styles.noTrailerText}>
                        Loading YouTube Trailer...
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailsContainer}>
                  <Text style={styles.modalTitle}>
                    {selectedMovie.title || selectedMovie.name}
                  </Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.matchText}>
                      {Math.round((selectedMovie.vote_average || 8) * 10)}%
                      Match
                    </Text>
                    <Text style={styles.badgeText}>HD</Text>
                    <Text style={styles.badgeText}>
                      {selectedMovie.release_date?.split("-")[0] || "2026"}
                    </Text>
                  </View>

                  <View style={styles.modalActionButtonsRow}>
                    <TouchableOpacity
                      style={styles.fullPlayBtn}
                      onPress={() => handleStartWatching(selectedMovie)}
                    >
                      <Ionicons name="play" size={18} color="#000000" />
                      <Text style={styles.fullPlayBtnText}>Watch Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.myListBtn}
                      onPress={() => toggleMyList(selectedMovie)}
                    >
                      <Ionicons
                        name={
                          isSelectedInMyList ? "checkmark-sharp" : "add-sharp"
                        }
                        size={22}
                        color="#FFFFFF"
                      />
                      <Text style={styles.myListBtnText}>
                        {isSelectedInMyList ? "In List" : "My List"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.seasonSelectorContainer}>
                    <Text style={styles.seasonTitle}>Seasons & Episodes</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginVertical: 6 }}
                    >
                      {[1, 2, 3].map((season) => (
                        <TouchableOpacity
                          key={season}
                          style={[
                            styles.seasonChip,
                            selectedSeason === season &&
                              styles.seasonChipActive,
                          ]}
                          onPress={() => setSelectedSeason(season)}
                        >
                          <Text
                            style={[
                              styles.seasonChipText,
                              selectedSeason === season &&
                                styles.seasonChipTextActive,
                            ]}
                          >
                            Season {season}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={styles.episodeBox}>
                      <Ionicons
                        name="play-circle-outline"
                        size={24}
                        color="#E50914"
                      />
                      <Text style={styles.episodeText}>
                        E1: The Beginning (Season {selectedSeason})
                      </Text>
                    </View>
                  </View>

                  {(director || cast.length > 0) && (
                    <View style={styles.creditsBox}>
                      {director && (
                        <TouchableOpacity
                          style={styles.creditItemRow}
                          onPress={() =>
                            handleSelectPerson(
                              director.id,
                              director.name,
                              "Director",
                            )
                          }
                        >
                          <Text style={styles.creditLabel}>Director: </Text>
                          <Text style={styles.creditLinkText}>
                            {director.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {cast.length > 0 && (
                        <View style={styles.creditItemRow}>
                          <Text style={styles.creditLabel}>Cast: </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              flex: 1,
                            }}
                          >
                            {cast.map((item, idx) => (
                              <TouchableOpacity
                                key={item.id}
                                onPress={() =>
                                  handleSelectPerson(
                                    item.id,
                                    item.name,
                                    "Actor",
                                  )
                                }
                              >
                                <Text style={styles.creditLinkText}>
                                  {item.name}
                                  {idx < cast.length - 1 ? ", " : ""}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={styles.overviewText}>
                    {selectedMovie.overview}
                  </Text>

                  {similarMovies.length > 0 && (
                    <View style={styles.similarContainer}>
                      <Text style={styles.similarTitle}>More Like This</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {similarMovies.map((simMovie) => (
                          <TouchableOpacity
                            key={simMovie.id}
                            style={styles.similarCard}
                            onPress={() => handleSelectMovie(simMovie)}
                          >
                            <Image
                              source={{
                                uri: `${IMAGE_BASE_URL}${simMovie.poster_path}`,
                              }}
                              style={styles.similarPoster}
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* PERSON / BIO MODAL */}
      <Modal
        visible={personModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPersonModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlayCenter}
          onPress={() => setPersonModalVisible(false)}
        >
          <Pressable
            style={styles.personModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPersonModalVisible(false)}
            >
              <Ionicons name="close-circle" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {selectedPerson && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.personHeaderRow}>
                  {selectedPerson.profilePath ? (
                    <Image
                      source={{
                        uri: `${IMAGE_BASE_URL}${selectedPerson.profilePath}`,
                      }}
                      style={styles.personAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.personAvatar,
                        {
                          backgroundColor: "#333",
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <Ionicons name="person" size={40} color="#666" />
                    </View>
                  )}
                  <View style={styles.personHeaderInfo}>
                    <Text style={styles.personName}>{selectedPerson.name}</Text>
                    <Text style={styles.personRole}>{selectedPerson.role}</Text>
                  </View>
                </View>

                <Text style={styles.personBioTitle}>Biography</Text>
                <Text style={styles.personBioText}>{selectedPerson.bio}</Text>

                <Text style={styles.personBioTitle}>Known For</Text>
                {personLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#E50914"
                    style={{ marginVertical: 20 }}
                  />
                ) : (
                  <View style={styles.personMoviesGrid}>
                    {personMovies.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.personMovieCard}
                        onPress={() => {
                          setPersonModalVisible(false);
                          handleSelectMovie(m);
                        }}
                      >
                        <Image
                          source={{ uri: `${IMAGE_BASE_URL}${m.poster_path}` }}
                          style={styles.personMoviePoster}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* PROFILE & MENU MODAL */}
      <Modal
        visible={profileMenuVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlayCenter}
          onPress={() => setProfileMenuVisible(false)}
        >
          <Pressable
            style={styles.menuCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.menuHeaderTitle}>Account & Profile</Text>
            <Text style={styles.menuEmailText}>
              {userAccount?.email || "Guest User"}
            </Text>

            <View style={styles.profileToggleRow}>
              <TouchableOpacity
                style={[
                  styles.profileOption,
                  currentProfile === "Main" && styles.profileOptionActive,
                ]}
                onPress={() => setCurrentProfile("Main")}
              >
                <Ionicons name="person-circle" size={22} color="#E50914" />
                <Text style={styles.profileOptionText}>Main Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.profileOption,
                  currentProfile === "Kids" && styles.profileOptionActive,
                ]}
                onPress={() => setCurrentProfile("Kids")}
              >
                <Ionicons name="happy" size={22} color="#FFB800" />
                <Text style={styles.profileOptionText}>Kids Profile</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setProfileMenuVisible(false);
                setSettingsModalVisible(true);
              }}
            >
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
              <Text style={styles.menuItemText}>App Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleClearCache}
            >
              <Ionicons name="trash-bin-outline" size={20} color="#FFFFFF" />
              <Text style={styles.menuItemText}>
                Clear Cache & Watch History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#E50914" />
              <Text style={[styles.menuItemText, { color: "#E50914" }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* AUTHENTICATION MODAL */}
      <Modal
        visible={authModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlayCenter}
          onPress={() => setAuthModalVisible(false)}
        >
          <Pressable
            style={styles.authModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAuthModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.authTitle}>Sign In to ZPK-MAX</Text>
            <Text style={styles.authSubtitle}>
              Save your bookmarks and watch history across all devices.
            </Text>

            <TextInput
              style={styles.authInput}
              placeholder="Email address"
              placeholderTextColor="#777"
              value={authEmail}
              onChangeText={setAuthEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.authInput}
              placeholder="Password"
              placeholderTextColor="#777"
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.authSubmitBtn}
              onPress={handleSaveAccount}
            >
              <Text style={styles.authSubmitText}>Sign In</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal
        visible={settingsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlayCenter}
          onPress={() => setSettingsModalVisible(false)}
        >
          <Pressable
            style={styles.authModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.authTitle}>App Settings</Text>

            <Text style={styles.settingLabel}>Playback Video Quality</Text>
            <View style={styles.qualityRow}>
              {["Auto", "720p", "1080p", "4K"].map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.qualityChip,
                    videoQuality === q && styles.qualityChipActive,
                  ]}
                  onPress={() => setVideoQuality(q)}
                >
                  <Text
                    style={[
                      styles.qualityChipText,
                      videoQuality === q && styles.qualityChipTextActive,
                    ]}
                  >
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.toggleRowBtn}
              onPress={() => setAutoPlayNext(!autoPlayNext)}
            >
              <Text style={styles.settingLabel}>Auto-play Next Episode</Text>
              <Ionicons
                name={autoPlayNext ? "checkbox" : "square-outline"}
                size={22}
                color="#E50914"
              />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* VIDEO PLAYER OVERLAY / PIP MODE */}
      {playingMovie && (
        <View
          style={
            isPipMode ? styles.pipPlayerContainer : styles.fullPlayerContainer
          }
        >
          <View style={styles.playerHeader}>
            <Text style={styles.playerMovieTitle} numberOfLines={1}>
              {playingMovie.title || playingMovie.name}
            </Text>
            <View style={styles.playerControlsRight}>
              <TouchableOpacity
                onPress={() => setIsPipMode(!isPipMode)}
                style={{ marginRight: 12 }}
              >
                <Ionicons
                  name={isPipMode ? "expand-outline" : "contract-outline"}
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPlayingMovie(null)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.playerVideoFrame}>
            <Video
              source={{
                uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              }}
              style={{ width: "100%", height: "100%" }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ==========================================
// STYLESHEET
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141414",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#141414",
    justifyContent: "center",
    alignItems: "center",
  },
  mainContentWrapper: {
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#141414",
    zIndex: 10,
  },
  logoText: {
    color: "#E50914",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  searchIconButton: {
    padding: 4,
  },
  userBadge: {
    padding: 2,
  },
  headerLoginBtn: {
    backgroundColor: "#E50914",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  headerLoginText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 12,
  },
  searchBarActive: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222222",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  genreBarContainer: {
    paddingVertical: 8,
    backgroundColor: "#141414",
  },
  genrePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#262626",
    marginRight: 8,
  },
  genrePillSelected: {
    backgroundColor: "#FFFFFF",
  },
  genrePillText: {
    color: "#AAAAAA",
    fontSize: 12,
    fontWeight: "600",
  },
  genrePillTextSelected: {
    color: "#000000",
  },
  searchResultsContainer: {
    flex: 1,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterLabel: {
    color: "#8C8C8C",
    marginRight: 8,
    fontSize: 12,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#222",
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: "#E50914",
  },
  filterChipText: {
    color: "#8C8C8C",
    fontSize: 11,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  noResultsText: {
    color: "#8C8C8C",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
  },
  skeletonCard: {
    width: (width - 40) / 6,
    height: 160,
    backgroundColor: "#222222",
    borderRadius: 6,
    margin: 3,
    justify: "center",
    alignItems: "center",
  },
  cardContainer: {
    width: 120,
    marginRight: 8,
    position: "relative",
  },
  searchCard: {
    width: (width - 40) / 6,
    margin: 3,
    position: "relative",
  },
  posterImage: {
    width: 120,
    height: 180,
    borderRadius: 4,
    backgroundColor: "#222",
  },
  searchPoster: {
    width: "100%",
    height: 160,
    borderRadius: 4,
    backgroundColor: "#222",
  },
  quickBookmarkBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 4,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: "#444444",
    width: "100%",
    position: "absolute",
    bottom: 0,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#E50914",
  },
  categoryContainer: {
    marginVertical: 12,
  },
  categoryTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 16,
    marginBottom: 8,
  },
  carouselRowWrapper: {
    position: "relative",
  },
  scrollArrowBtn: {
    position: "absolute",
    top: "40%",
    zIndex: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 6,
    borderRadius: 20,
  },
  leftArrowBtn: {
    left: 4,
  },
  rightArrowBtn: {
    right: 4,
  },
  heroContainer: {
    height: 350,
    width: "100%",
    position: "relative",
    backgroundColor: "#000000",
  },
  heroTrailerWrapper: {
    width: "100%",
    height: "100%",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  indicatorContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#666",
    marginRight: 4,
  },
  indicatorDotActive: {
    backgroundColor: "#E50914",
    width: 14,
  },
  heroButtonsRow: {
    flexDirection: "row",
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  playText: {
    color: "#000000",
    fontWeight: "bold",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#181818",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: height * 0.85,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  videoWrapper: {
    height: 220,
    backgroundColor: "#000",
  },
  noTrailerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noTrailerText: {
    color: "#888",
    marginTop: 8,
    fontSize: 12,
  },
  detailsContainer: {
    padding: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  matchText: {
    color: "#46d369",
    fontWeight: "bold",
    marginRight: 10,
  },
  badgeText: {
    color: "#aaa",
    borderWidth: 1,
    borderColor: "#aaa",
    paddingHorizontal: 4,
    fontSize: 10,
    marginRight: 6,
    borderRadius: 2,
  },
  modalActionButtonsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  fullPlayBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    marginRight: 8,
  },
  fullPlayBtnText: {
    color: "#000",
    fontWeight: "bold",
    marginLeft: 6,
  },
  myListBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#333333",
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },
  myListBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    marginLeft: 4,
  },
  seasonSelectorContainer: {
    marginBottom: 16,
  },
  seasonTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  seasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#262626",
    marginRight: 6,
  },
  seasonChipActive: {
    backgroundColor: "#E50914",
  },
  seasonChipText: {
    color: "#aaa",
    fontSize: 12,
  },
  seasonChipTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },
  episodeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    padding: 10,
    borderRadius: 4,
    marginTop: 4,
  },
  episodeText: {
    color: "#FFF",
    marginLeft: 8,
    fontSize: 13,
  },
  creditsBox: {
    marginBottom: 12,
  },
  creditItemRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  creditLabel: {
    color: "#777",
    fontSize: 12,
  },
  creditLinkText: {
    color: "#DDD",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  overviewText: {
    color: "#CCC",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  similarContainer: {
    marginTop: 8,
  },
  similarTitle: {
    color: "#FFF",
    fontWeight: "bold",
    marginBottom: 8,
  },
  similarCard: {
    marginRight: 8,
  },
  similarPoster: {
    width: 90,
    height: 135,
    borderRadius: 4,
  },
  personModalContent: {
    backgroundColor: "#181818",
    width: "90%",
    maxHeight: "80%",
    borderRadius: 12,
    padding: 16,
  },
  personHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  personAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  personHeaderInfo: {
    flex: 1,
  },
  personName: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  personRole: {
    color: "#E50914",
    fontSize: 12,
  },
  personBioTitle: {
    color: "#FFF",
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 4,
  },
  personBioText: {
    color: "#AAA",
    fontSize: 12,
    lineHeight: 16,
  },
  personMoviesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  personMovieCard: {
    width: "31%",
    margin: "1%",
  },
  personMoviePoster: {
    width: "100%",
    height: 120,
    borderRadius: 4,
  },
  menuCard: {
    backgroundColor: "#1F1F1F",
    width: "85%",
    borderRadius: 8,
    padding: 16,
  },
  menuHeaderTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  menuEmailText: {
    color: "#888",
    fontSize: 12,
    marginBottom: 16,
  },
  profileToggleRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  profileOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#333",
    marginRight: 8,
  },
  profileOptionActive: {
    borderColor: "#E50914",
    backgroundColor: "#262626",
  },
  profileOptionText: {
    color: "#FFF",
    fontSize: 12,
    marginLeft: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  menuItemText: {
    color: "#FFF",
    marginLeft: 10,
    fontSize: 14,
  },
  authModalCard: {
    backgroundColor: "#1F1F1F",
    width: "85%",
    borderRadius: 8,
    padding: 20,
  },
  authTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  authSubtitle: {
    color: "#888",
    fontSize: 12,
    marginBottom: 16,
  },
  authInput: {
    backgroundColor: "#333",
    color: "#FFF",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  authSubmitBtn: {
    backgroundColor: "#E50914",
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: "center",
  },
  authSubmitText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  settingLabel: {
    color: "#AAA",
    fontSize: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  qualityRow: {
    flexDirection: "row",
  },
  qualityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "#333",
    marginRight: 6,
  },
  qualityChipActive: {
    backgroundColor: "#E50914",
  },
  qualityChipText: {
    color: "#888",
    fontSize: 12,
  },
  qualityChipTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },
  toggleRowBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  fullPlayerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    zIndex: 999,
  },
  pipPlayerContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 240,
    height: 150,
    backgroundColor: "#000",
    borderRadius: 8,
    zIndex: 999,
    overflow: "hidden",
    elevation: 10,
  },
  playerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  playerMovieTitle: {
    color: "#FFF",
    fontSize: 12,
    flex: 1,
  },
  playerControlsRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  playerVideoFrame: {
    flex: 1,
  },
});
