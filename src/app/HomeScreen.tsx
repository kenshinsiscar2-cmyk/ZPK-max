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

export default function HomeScreen() {
  const [heroMovie, setHeroMovie] = useState<any>(null);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [action, setAction] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Preview & Auth Modal state
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
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

  // Live TMDB Search Debounce Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(
            searchQuery,
          )}`,
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

  const handleSelectMovie = async (movie: any) => {
    setSelectedMovie(movie);
    setTrailerKey(null);
    const key = await fetchMovieTrailer(movie.id);
    setTrailerKey(key);
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
        {isSearching && searchQuery.length > 0 ? (
          <View style={styles.searchResultsContainer}>
            {searchLoading ? (
              <ActivityIndicator
                size="large"
                color="#E50914"
                style={{ marginTop: 40 }}
              />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                numColumns={3}
                keyExtractor={(item: any) => item.id.toString()}
                contentContainerStyle={{ padding: 10 }}
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
              <>
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
                </View>
              </>
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
        <View style={styles.authModalOverlay}>
          <View style={styles.authBox}>
            <TouchableOpacity
              style={styles.authCloseBtn}
              onPress={() => setShowAuthModal(false)}
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
          </View>
        </View>
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
    height: height * 0.75,
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
  },
  fullPlayBtnText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
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
  authCloseBtn: { position: "absolute", top: 16, right: 16 },
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
