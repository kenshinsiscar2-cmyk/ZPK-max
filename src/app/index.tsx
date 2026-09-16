import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
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

const MovieCard = React.memo(
  ({
    item,
    onSelect,
    isSearch = false,
    progress,
  }: {
    item: any;
    onSelect: (item: any) => void;
    isSearch?: boolean;
    progress?: number;
  }) => (
    <TouchableOpacity
      style={isSearch ? styles.searchCard : styles.cardContainer}
      activeOpacity={0.7}
      onPress={() => onSelect(item)}
    >
      <Image
        source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
        style={isSearch ? styles.searchPoster : styles.posterImage}
      />
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
  }: {
    title: string;
    data: any[];
    onSelectMovie: (movie: any) => void;
    getProgress?: (id: number) => number | undefined;
  }) => {
    const flatListRef = useRef<FlatList>(null);
    const scrollOffset = useRef(0);

    const handleScroll = (direction: "left" | "right") => {
      const scrollAmount = 300;
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
        />
      ),
      [onSelectMovie, getProgress],
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
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              scrollOffset.current = e.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={32}
            keyExtractor={(item: any, index: number) => `${item.id}-${index}`}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            renderItem={renderItem}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
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

function HomeScreen() {
  const [heroMovie, setHeroMovie] = useState<any>(null);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [action, setAction] = useState([]);
  const [loading, setLoading] = useState(true);

  const [myList, setMyList] = useState<any[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);

  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [genreMovies, setGenreMovies] = useState<any[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genrePage, setGenrePage] = useState(1);
  const [hasMoreGenre, setHasMoreGenre] = useState(true);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);
  const [sortBy, setSortBy] = useState<"popularity" | "rating" | "release">(
    "popularity",
  );

  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [director, setDirector] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [cast, setCast] = useState<{ id: number; name: string }[]>([]);
  const [similarMovies, setSimilarMovies] = useState<any[]>([]);

  const [personModalVisible, setPersonModalVisible] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<{
    id: number;
    name: string;
    role: string;
  } | null>(null);
  const [personMovies, setPersonMovies] = useState<any[]>([]);
  const [personLoading, setPersonLoading] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        setHeroMovie(
          trendingData[Math.floor(Math.random() * trendingData.length)],
        );
      }

      await loadStoredData();
      setLoading(false);
    }

    loadData();
  }, []);

  const loadStoredData = async () => {
    try {
      const storedList = await AsyncStorage.getItem("@zpk_mylist");
      const storedContinue = await AsyncStorage.getItem(
        "@zpk_continue_watching",
      );
      if (storedList) setMyList(JSON.parse(storedList));
      if (storedContinue) setContinueWatching(JSON.parse(storedContinue));
    } catch (e) {
      console.error("Failed to load storage:", e);
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

  const handleStartWatching = async (movie: any) => {
    try {
      let updated = [...continueWatching];
      const existingIndex = updated.findIndex((m) => m.id === movie.id);

      const movieItem = {
        ...movie,
        progress:
          existingIndex >= 0
            ? updated[existingIndex].progress
            : Math.random() * 0.6 + 0.2,
      };

      if (existingIndex >= 0) {
        updated.splice(existingIndex, 1);
      }
      updated.unshift(movieItem);

      setContinueWatching(updated);
      await AsyncStorage.setItem(
        "@zpk_continue_watching",
        JSON.stringify(updated),
      );
      handleOpenAuthModal();
    } catch (e) {
      console.error("Failed to update continue watching:", e);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchPage(1);
      setHasMoreSearch(true);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchPage(1);
      try {
        const response = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(
            searchQuery,
          )}&page=1`,
        );
        const validMovies = response.data.results.filter(
          (m: any) => m.poster_path,
        );
        setSearchResults(validMovies);
        setHasMoreSearch(1 < response.data.total_pages);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMoreSearchResults = async () => {
    if (searchLoading || !hasMoreSearch || !searchQuery.trim()) return;

    const nextPage = searchPage + 1;
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(
          searchQuery,
        )}&page=${nextPage}`,
      );
      const newMovies = response.data.results.filter((m: any) => m.poster_path);
      setSearchResults((prev) => [...prev, ...newMovies]);
      setSearchPage(nextPage);
      setHasMoreSearch(nextPage < response.data.total_pages);
    } catch (error) {
      console.error("Load more search error:", error);
    }
  };

  const getFilteredSearchResults = () => {
    const list = [...searchResults];
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
    setGenrePage(1);
    setHasMoreGenre(true);

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
      setHasMoreGenre(1 < response.data.total_pages);
    } catch (error) {
      console.error("Genre fetch error:", error);
    } finally {
      setGenreLoading(false);
    }
  };

  const loadMoreGenreResults = async () => {
    if (genreLoading || !hasMoreGenre || !selectedGenre) return;

    const nextPage = genrePage + 1;
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${selectedGenre}&page=${nextPage}`,
      );
      const newMovies = response.data.results.filter((m: any) => m.poster_path);
      setGenreMovies((prev) => [...prev, ...newMovies]);
      setGenrePage(nextPage);
      setHasMoreGenre(nextPage < response.data.total_pages);
    } catch (error) {
      console.error("Load more genre error:", error);
    }
  };

  const handleSelectMovie = useCallback(async (movie: any) => {
    setSelectedMovie(movie);
    setTrailerKey(null);
    setDirector(null);
    setCast([]);
    setSimilarMovies([]);

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
          castList.slice(0, 4).map((c: any) => ({ id: c.id, name: c.name })),
        );
      })
      .catch((err) => console.error("Credits error:", err));

    axios
      .get(
        `https://api.themoviedb.org/3/movie/${movie.id}/similar?api_key=${API_KEY}`,
      )
      .then((res) => {
        const validRecommendations = (res.data.results || []).filter(
          (m: any) => m.poster_path,
        );
        setSimilarMovies(validRecommendations);
      })
      .catch((err) => console.error("Similar error:", err));
  }, []);

  const handleSelectPerson = async (id: number, name: string, role: string) => {
    setSelectedMovie(null);
    setSelectedPerson({ id, name, role });
    setPersonModalVisible(true);
    setPersonLoading(true);
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/person/${id}/movie_credits?api_key=${API_KEY}`,
      );
      const movies =
        (role === "Director" ? response.data.crew : response.data.cast) || [];
      const validMovies = movies.filter((m: any) => m.poster_path).slice(0, 18);
      setPersonMovies(validMovies);
    } catch (e) {
      console.error("Person credits error:", e);
    } finally {
      setPersonLoading(false);
    }
  };

  const handleOpenAuthModal = () => {
    setSelectedMovie(null);
    setTimeout(() => {
      setShowAuthModal(true);
    }, 200);
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
                activeOpacity={0.7}
              >
                <Ionicons name="search" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.logoText}>ZPK-MAX</Text>
              <View style={{ width: 28 }} />
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
                  activeOpacity={0.8}
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
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  sortBy === "popularity" && styles.filterChipActive,
                ]}
                onPress={() => setSortBy("popularity")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sortBy === "popularity" && styles.filterChipTextActive,
                  ]}
                >
                  Popular
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  sortBy === "rating" && styles.filterChipActive,
                ]}
                onPress={() => setSortBy("rating")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sortBy === "rating" && styles.filterChipTextActive,
                  ]}
                >
                  Rating ⭐
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  sortBy === "release" && styles.filterChipActive,
                ]}
                onPress={() => setSortBy("release")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sortBy === "release" && styles.filterChipTextActive,
                  ]}
                >
                  Year 📅
                </Text>
              </TouchableOpacity>
            </View>

            {searchLoading && searchPage === 1 ? (
              <ActivityIndicator
                size="large"
                color="#E50914"
                style={{ marginTop: 40 }}
              />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={getFilteredSearchResults()}
                numColumns={3}
                keyExtractor={(item: any, index: number) =>
                  `${item.id}-${index}`
                }
                contentContainerStyle={{ padding: 10 }}
                onEndReached={loadMoreSearchResults}
                onEndReachedThreshold={0.5}
                removeClippedSubviews={Platform.OS !== "web"}
                renderItem={({ item }: { item: any }) => (
                  <MovieCard
                    item={item}
                    onSelect={handleSelectMovie}
                    isSearch
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
            {genreLoading && genrePage === 1 ? (
              <ActivityIndicator
                size="large"
                color="#E50914"
                style={{ marginTop: 40 }}
              />
            ) : (
              <FlatList
                data={genreMovies}
                numColumns={3}
                keyExtractor={(item: any, index: number) =>
                  `${item.id}-${index}`
                }
                contentContainerStyle={{ padding: 10 }}
                onEndReached={loadMoreGenreResults}
                onEndReachedThreshold={0.5}
                removeClippedSubviews={Platform.OS !== "web"}
                renderItem={({ item }: { item: any }) => (
                  <MovieCard
                    item={item}
                    onSelect={handleSelectMovie}
                    isSearch
                  />
                )}
              />
            )}
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {heroMovie && (
              <View style={styles.heroContainer}>
                <Image
                  source={{
                    uri: `${ORIGINAL_IMAGE_URL}${heroMovie.backdrop_path || heroMovie.poster_path}`,
                  }}
                  style={styles.heroImage}
                />
                <View style={styles.heroOverlay} />
                <View style={styles.heroContent}>
                  <Text style={styles.heroTitle} numberOfLines={1}>
                    {heroMovie.title || heroMovie.name}
                  </Text>
                  <View style={styles.heroButtonsRow}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => handleSelectMovie(heroMovie)}
                      activeOpacity={0.8}
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
              />
            )}

            {myList.length > 0 && (
              <MovieRow
                title="My List"
                data={myList}
                onSelectMovie={handleSelectMovie}
              />
            )}

            <MovieRow
              title="Trending Now"
              data={trending}
              onSelectMovie={handleSelectMovie}
            />
            <MovieRow
              title="Top Rated"
              data={topRated}
              onSelectMovie={handleSelectMovie}
            />
            <MovieRow
              title="Action Thrillers"
              data={action}
              onSelectMovie={handleSelectMovie}
            />
          </ScrollView>
        )}
      </View>

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
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={18} color="#000000" />
                      <Text style={styles.fullPlayBtnText}>
                        Watch Full Movie
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.myListBtn}
                      onPress={() => toggleMyList(selectedMovie)}
                      activeOpacity={0.7}
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

                  <Text style={styles.description} numberOfLines={4}>
                    {selectedMovie.overview ||
                      "No description available for this title."}
                  </Text>

                  {similarMovies.length > 0 && (
                    <View style={styles.similarSection}>
                      <Text style={styles.similarTitle}>More Like This</Text>
                      <FlatList
                        data={similarMovies}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item: any) => item.id.toString()}
                        renderItem={({ item }: { item: any }) => (
                          <MovieCard item={item} onSelect={handleSelectMovie} />
                        )}
                      />
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={personModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPersonModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPersonModalVisible(false)}
        >
          <Pressable
            style={[styles.modalContent, { height: height * 0.75 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPersonModalVisible(false)}
            >
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ padding: 18, flex: 1 }}>
              <Text style={styles.personRoleLabel}>{selectedPerson?.role}</Text>
              <Text style={styles.personNameTitle}>{selectedPerson?.name}</Text>
              <Text style={styles.personSubheader}>Known Movies & Shows</Text>

              {personLoading ? (
                <ActivityIndicator
                  size="large"
                  color="#E50914"
                  style={{ marginTop: 40 }}
                />
              ) : (
                <FlatList
                  data={personMovies}
                  numColumns={3}
                  keyExtractor={(item: any, idx) => `${item.id}-${idx}`}
                  contentContainerStyle={{ paddingTop: 12 }}
                  renderItem={({ item }: { item: any }) => (
                    <MovieCard
                      item={item}
                      onSelect={(m) => {
                        setPersonModalVisible(false);
                        handleSelectMovie(m);
                      }}
                      isSearch
                    />
                  )}
                />
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showAuthModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAuthModal(false)}
      >
        <Pressable
          style={styles.authModalOverlay}
          onPress={() => setShowAuthModal(false)}
        >
          <Pressable
            style={styles.authBox}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.authCloseBtn}
              onPress={() => setShowAuthModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#AAAAAA" />
            </TouchableOpacity>

            <Text style={styles.authTitle}>Sign In Required</Text>
            <Text style={styles.authSubtitle}>
              Sign in to your ZPK-MAX account to stream full movies and TV
              shows.
            </Text>

            <TextInput
              style={styles.authInput}
              placeholder="Email or phone number"
              placeholderTextColor="#8C8C8C"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.authInput}
              placeholder="Password"
              placeholderTextColor="#8C8C8C"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={styles.signInSubmitBtn}
              onPress={() => {
                setShowAuthModal(false);
                alert("Welcome back!");
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.signInSubmitText}>Sign In</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#141414" },
  mainContentWrapper: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#141414",
    justifyContent: "center",
    alignItems: "center",
  },
  topHeader: {
    height: Platform.OS === "ios" ? 60 : 54,
    backgroundColor: "#141414",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 8 : 0,
    width: "100%",
    zIndex: 99,
  },
  logoText: {
    color: "#E50914",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },
  searchIconButton: { padding: 4 },
  searchBarActive: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#262626",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 13 },
  genreBarContainer: { paddingVertical: 6, backgroundColor: "#141414" },
  genrePill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: "#262626",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  genrePillSelected: { backgroundColor: "#E50914", borderColor: "#E50914" },
  genrePillText: { color: "#AAAAAA", fontSize: 12, fontWeight: "600" },
  genrePillTextSelected: { color: "#FFFFFF" },
  searchResultsContainer: { flex: 1, backgroundColor: "#141414" },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1C1C1C",
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  filterLabel: {
    color: "#888888",
    fontSize: 12,
    marginRight: 8,
    fontWeight: "600",
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#262626",
    marginRight: 6,
  },
  filterChipActive: { backgroundColor: "#E50914" },
  filterChipText: { color: "#AAAAAA", fontSize: 11, fontWeight: "600" },
  filterChipTextActive: { color: "#FFFFFF" },
  searchCard: {
    flex: 1 / 3,
    height: 150,
    margin: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  searchPoster: { width: "100%", height: "100%", resizeMode: "cover" },
  noResultsText: {
    color: "#888888",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  heroContainer: {
    height: height * 0.35,
    width: width,
    position: "relative",
    marginBottom: 12,
  },
  heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 20, 20, 0.4)",
  },
  heroContent: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  heroButtonsRow: { flexDirection: "row", justifyContent: "center" },
  playButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 22,
    borderRadius: 4,
  },
  playText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 14,
    marginLeft: 6,
  },
  categoryContainer: { marginBottom: 16 },
  categoryTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    paddingLeft: 16,
  },
  carouselRowWrapper: { position: "relative", justifyContent: "center" },
  scrollArrowBtn: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 32,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  leftArrowBtn: {
    left: 0,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  rightArrowBtn: {
    right: 0,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  cardContainer: {
    marginRight: 8,
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
  },
  posterImage: {
    width: 100,
    height: 145,
    borderRadius: 6,
    backgroundColor: "#222222",
  },
  progressBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#E50914",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
    zIndex: 1000,
    elevation: 10,
  },
  modalContent: {
    height: height * 0.82,
    backgroundColor: "#181818",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  closeButton: { position: "absolute", top: 12, right: 12, zIndex: 99 },
  videoWrapper: { width: "100%", height: 220, backgroundColor: "#000000" },
  noTrailerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noTrailerText: { color: "#AAAAAA", marginTop: 8, fontSize: 12 },
  detailsContainer: { padding: 18 },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  matchText: {
    color: "#46D369",
    fontWeight: "800",
    marginRight: 10,
    fontSize: 13,
  },
  badgeText: {
    color: "#AAAAAA",
    borderColor: "#555555",
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    fontSize: 10,
    borderRadius: 2,
    marginRight: 6,
  },
  modalActionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  fullPlayBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 4,
    marginRight: 10,
  },
  fullPlayBtnText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 14,
    marginLeft: 6,
  },
  myListBtn: {
    backgroundColor: "#262626",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#333333",
  },
  myListBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 4,
  },
  creditsBox: {
    marginBottom: 12,
    backgroundColor: "#222222",
    padding: 10,
    borderRadius: 6,
  },
  creditItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  creditLabel: { color: "#888888", fontWeight: "600", fontSize: 12 },
  creditLinkText: {
    color: "#46D369",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  personRoleLabel: {
    color: "#E50914",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  personNameTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 2,
  },
  personSubheader: { color: "#888888", fontSize: 13, marginBottom: 10 },
  description: {
    color: "#DDDDDD",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  similarSection: { marginTop: 10 },
  similarTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  authModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 9999,
    elevation: 20,
  },
  authBox: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333333",
    position: "relative",
    elevation: 5,
  },
  authCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 6,
  },
  authTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  authSubtitle: {
    color: "#AAAAAA",
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 18,
  },
  authInput: {
    backgroundColor: "#262626",
    color: "#FFFFFF",
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#333333",
  },
  signInSubmitBtn: {
    backgroundColor: "#E50914",
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  signInSubmitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});

// SIGURADUHING NAKA-EXPORT ITO NANG HIWALAY SA DULO
export default HomeScreen;
