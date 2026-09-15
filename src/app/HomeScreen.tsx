import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
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

export default function HomeScreen() {
  const [heroMovie, setHeroMovie] = useState<any>(null);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [action, setAction] = useState([]);
  const [loading, setLoading] = useState(true);

  // Genre filter & pagination state
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [genreMovies, setGenreMovies] = useState<any[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genrePage, setGenrePage] = useState(1);
  const [hasMoreGenre, setHasMoreGenre] = useState(true);

  // Search & pagination state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);

  // Preview, Credits, Recommendations & Auth Modal state
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [director, setDirector] = useState<string>("");
  const [cast, setCast] = useState<string[]>([]);
  const [similarMovies, setSimilarMovies] = useState<any[]>([]);
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

      setLoading(false);
    }

    loadData();
  }, []);

  // Live TMDB Search Debounce Logic (Resets to page 1)
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

  // Infinite Scroll: Fetch Next Search Page
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

  // Handle Genre Selection (Resets to page 1)
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

  // Infinite Scroll: Fetch Next Genre Page
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

  // Handle Select Movie (Trailer, Credits & Similar Movies)
  const handleSelectMovie = async (movie: any) => {
    setSelectedMovie(movie);
    setTrailerKey(null);
    setDirector("");
    setCast([]);
    setSimilarMovies([]);

    // Fetch Trailer
    fetchMovieTrailer(movie.id).then((key) => setTrailerKey(key));

    // Fetch Cast & Director Credits
    axios
      .get(
        `https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${API_KEY}`,
      )
      .then((res) => {
        const crew = res.data.crew || [];
        const castList = res.data.cast || [];
        const dirObj = crew.find((member: any) => member.job === "Director");
        if (dirObj) setDirector(dirObj.name);
        setCast(castList.slice(0, 4).map((c: any) => c.name));
      })
      .catch((err) => console.error("Credits error:", err));

    // Fetch Similar / "More Like This" Recommendations
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
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  const CATEGORIES = [
    { title: "Trending Now", data: trending },
    { title: "Top Rated", data: topRated },
    { title: "Action Thrillers", data: action },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* TOP NAVIGATION HEADER */}
      <View style={styles.topHeader}>
        {!isSearching ? (
          <>
            <Text style={styles.logoText}>ZPK-MAX</Text>
            <TouchableOpacity
              style={styles.searchIconButton}
              onPress={() => setIsSearching(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={24} color="#FFFFFF" />
            </TouchableOpacity>
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
              placeholder="Search movies, TV shows..."
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

      {/* Main Content Area */}
      <View style={{ flex: 1, marginTop: 60 }}>
        {/* GENRE FILTER PILLS */}
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

        {/* SEARCH RESULTS GRID (WITH INFINITE SCROLL) */}
        {isSearching && searchQuery.length > 0 ? (
          <View style={styles.searchResultsContainer}>
            {searchLoading && searchPage === 1 ? (
              <ActivityIndicator
                size="large"
                color="#E50914"
                style={{ marginTop: 40 }}
              />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                numColumns={3}
                keyExtractor={(item: any, index: number) =>
                  `${item.id}-${index}`
                }
                contentContainerStyle={{ padding: 10 }}
                onEndReached={loadMoreSearchResults}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  hasMoreSearch ? (
                    <ActivityIndicator
                      size="small"
                      color="#E50914"
                      style={{ marginVertical: 16 }}
                    />
                  ) : null
                }
                renderItem={({ item }: { item: any }) => (
                  <TouchableOpacity
                    style={styles.searchCard}
                    onPress={() => handleSelectMovie(item)}
                  >
                    <Image
                      source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
                      style={styles.searchPoster}
                    />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text style={styles.noResultsText}>
                No movies found for "{searchQuery}"
              </Text>
            )}
          </View>
        ) : selectedGenre ? (
          /* GENRE RESULTS GRID (WITH INFINITE SCROLL) */
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
                ListFooterComponent={
                  hasMoreGenre ? (
                    <ActivityIndicator
                      size="small"
                      color="#E50914"
                      style={{ marginVertical: 16 }}
                    />
                  ) : null
                }
                renderItem={({ item }: { item: any }) => (
                  <TouchableOpacity
                    style={styles.searchCard}
                    onPress={() => handleSelectMovie(item)}
                  >
                    <Image
                      source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
                      style={styles.searchPoster}
                    />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        ) : (
          /* REGULAR HOME FEED */
          <ScrollView showsVerticalScrollIndicator={false}>
            {heroMovie && (
              <View style={styles.heroContainer}>
                <Image
                  source={{
                    uri: `${ORIGINAL_IMAGE_URL}${heroMovie.backdrop_path || heroMovie.poster_path}`,
                  }}
                  style={styles.heroImage}
                />
                <View style={styles.heroContent}>
                  <Text style={styles.heroTitle}>
                    {heroMovie.title || heroMovie.name}
                  </Text>
                  <View style={styles.heroButtonsRow}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => handleSelectMovie(heroMovie)}
                    >
                      <Ionicons name="play" size={22} color="#000000" />
                      <Text style={styles.playText}>Play</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {CATEGORIES.map((category) => (
              <View key={category.title} style={styles.categoryContainer}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <FlatList
                  data={category.data}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item: any) => item.id.toString()}
                  renderItem={({ item }: { item: any }) => (
                    <TouchableOpacity
                      style={styles.cardContainer}
                      activeOpacity={0.8}
                      onPress={() => handleSelectMovie(item)}
                    >
                      <Image
                        source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
                        style={styles.posterImage}
                      />
                    </TouchableOpacity>
                  )}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* MOVIE PREVIEW MODAL */}
      <Modal
        visible={selectedMovie !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMovie(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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

                  {/* CAST & DIRECTOR DETAILS */}
                  {(director !== "" || cast.length > 0) && (
                    <View style={styles.creditsBox}>
                      {director !== "" && (
                        <Text style={styles.creditText}>
                          <Text style={styles.creditLabel}>Director: </Text>
                          {director}
                        </Text>
                      )}
                      {cast.length > 0 && (
                        <Text style={styles.creditText} numberOfLines={1}>
                          <Text style={styles.creditLabel}>Cast: </Text>
                          {cast.join(", ")}
                        </Text>
                      )}
                    </View>
                  )}

                  <Text style={styles.description} numberOfLines={4}>
                    {selectedMovie.overview ||
                      "No description available for this title."}
                  </Text>

                  <TouchableOpacity
                    style={styles.fullPlayBtn}
                    onPress={() => setShowAuthModal(true)}
                  >
                    <Ionicons name="play" size={20} color="#000000" />
                    <Text style={styles.fullPlayBtnText}>Watch Full Movie</Text>
                  </TouchableOpacity>

                  {/* MORE LIKE THIS RECOMMENDATIONS CAROUSEL */}
                  {similarMovies.length > 0 && (
                    <View style={styles.similarSection}>
                      <Text style={styles.similarTitle}>More Like This</Text>
                      <FlatList
                        data={similarMovies}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item: any) => item.id.toString()}
                        renderItem={({ item }: { item: any }) => (
                          <TouchableOpacity
                            style={styles.similarCard}
                            onPress={() => handleSelectMovie(item)}
                          >
                            <Image
                              source={{
                                uri: `${IMAGE_BASE_URL}${item.poster_path}`,
                              }}
                              style={styles.similarPoster}
                            />
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* SIGN IN POPUP MODAL */}
      <Modal
        visible={showAuthModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAuthModal(false)}
      >
        <TouchableOpacity
          style={styles.authModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAuthModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.authBox}>
            <TouchableOpacity
              style={styles.authCloseBtn}
              onPress={() => setShowAuthModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#AAAAAA" />
            </TouchableOpacity>

            <Text style={styles.authTitle}>Sign In Required</Text>
            <Text style={styles.authSubtitle}>
              Sign in to your ZPK-max account to stream full movies and TV
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
                alert(`Welcome back!`);
              }}
            >
              <Text style={styles.signInSubmitText}>Sign In</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },

  topHeader: {
    height: 60,
    backgroundColor: "#000000",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    position: (Platform.OS === "web" ? "fixed" : "absolute") as any,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 10,
  },
  logoText: {
    color: "#E50914",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
  },
  searchIconButton: { padding: 8, cursor: "pointer" } as any,
  searchBarActive: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#262626",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    outlineStyle: "none",
  } as any,

  genreBarContainer: { paddingVertical: 10, backgroundColor: "#000000" },
  genrePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#1E1E1E",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  genrePillSelected: { backgroundColor: "#E50914", borderColor: "#E50914" },
  genrePillText: { color: "#AAAAAA", fontSize: 13, fontWeight: "600" },
  genrePillTextSelected: { color: "#FFFFFF" },

  searchResultsContainer: { flex: 1, backgroundColor: "#000000" },
  searchCard: {
    flex: 1 / 3,
    height: 160,
    margin: 4,
    borderRadius: 4,
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
    height: 420,
    width: width,
    position: "relative",
    marginBottom: 20,
  },
  heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  heroButtonsRow: { flexDirection: "row", justifyContent: "center" },
  playButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 30,
    borderRadius: 4,
  },
  playText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 6,
  },
  categoryContainer: { marginBottom: 20 },
  categoryTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    paddingLeft: 16,
  },
  cardContainer: { marginRight: 10, marginLeft: 6 },
  posterImage: {
    width: 120,
    height: 180,
    borderRadius: 6,
    backgroundColor: "#1C1C1C",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: height * 0.8,
    backgroundColor: "#181818",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  closeButton: { position: "absolute", top: 12, right: 12, zIndex: 10 },
  videoWrapper: { width: "100%", height: 220, backgroundColor: "#000000" },
  noTrailerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noTrailerText: { color: "#AAAAAA", marginTop: 8, fontSize: 12 },
  detailsContainer: { padding: 20 },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  matchText: { color: "#46D369", fontWeight: "700", marginRight: 12 },
  badgeText: {
    color: "#AAAAAA",
    borderColor: "#AAAAAA",
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontSize: 10,
    borderRadius: 2,
    marginRight: 8,
  },

  creditsBox: { marginBottom: 12 },
  creditText: { color: "#CCCCCC", fontSize: 13, marginBottom: 2 },
  creditLabel: { color: "#777777", fontWeight: "600" },

  description: {
    color: "#CCCCCC",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  fullPlayBtn: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  fullPlayBtnText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },

  /* More Like This Recommendations Styling */
  similarSection: { marginTop: 10 },
  similarTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  similarCard: { marginRight: 10 },
  similarPoster: {
    width: 100,
    height: 150,
    borderRadius: 4,
    backgroundColor: "#222222",
  },

  authModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  authBox: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#000000",
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333333",
    position: "relative",
  },
  authCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    cursor: "pointer",
  } as any,
  authTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
  },
  authSubtitle: {
    color: "#AAAAAA",
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 18,
  },
  authInput: {
    backgroundColor: "#333333",
    color: "#FFFFFF",
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  signInSubmitBtn: {
    backgroundColor: "#E50914",
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  signInSubmitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
