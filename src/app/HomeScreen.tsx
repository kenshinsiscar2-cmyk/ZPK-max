import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
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

export default function HomeScreen() {
  const [heroMovie, setHeroMovie] = useState<any>(null);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [action, setAction] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal & Preview State
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);

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

  // Fetch YouTube Key dynamically on movie tap
  const handleSelectMovie = async (movie: any) => {
    setSelectedMovie(movie);
    setTrailerKey(null); // Reset key while fetching
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Dynamic Hero Banner */}
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

        {/* Dynamic Category Rows */}
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

      {/* --- MOVIE PREVIEW MODAL WITH YOUTUBE TRAILER --- */}
      <Modal
        visible={selectedMovie !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMovie(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedMovie(null)}
            >
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {selectedMovie && (
              <>
                {/* YouTube Video Player Embed */}
                <View style={styles.videoWrapper}>
                  {trailerKey ? (
                    <YoutubePlayer
                      height={220}
                      play={true}
                      videoId={trailerKey}
                    />
                  ) : (
                    <View style={styles.noTrailerContainer}>
                      <ActivityIndicator size="small" color="#E50914" />
                      <Text style={styles.noTrailerText}>
                        Loading YouTube Trailer...
                      </Text>
                    </View>
                  )}
                </View>

                {/* Details Section */}
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

                  <TouchableOpacity style={styles.fullPlayBtn}>
                    <Ionicons name="play" size={20} color="#000000" />
                    <Text style={styles.fullPlayBtnText}>Watch Full Movie</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  heroContainer: {
    height: 450,
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
    fontSize: 28,
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

  /* Modal Styling */
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
});
