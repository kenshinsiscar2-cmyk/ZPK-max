import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { IMAGE_BASE_URL } from "../services/tmdb";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 32) / 3; // Calculate 3-column grid width with padding

// Grab the TMDB key from your services file
const API_KEY = "ddf5724768b00aee5a7630ebe654913d";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search TMDB API dynamically as query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(
            query,
          )}`,
        );
        // Filter out movies without posters
        const validMovies = response.data.results.filter(
          (m: any) => m.poster_path,
        );
        setResults(validMovies);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce delay to optimize network calls

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* --- NETFLIX-STYLE SEARCH BAR --- */}
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#8C8C8C"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Search movies, TV shows..."
            placeholderTextColor="#8C8C8C"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#8C8C8C" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* --- RESULTS DISPLAY --- */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : query.length > 0 && results.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="film-outline" size={48} color="#333333" />
          <Text style={styles.emptyText}>
            Oh no. We couldn't find dynamic titles for "{query}".
          </Text>
        </View>
      ) : query.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search" size={48} color="#333333" />
          <Text style={styles.emptyText}>
            Find your favorite movies and shows.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          numColumns={3}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.gridContainer}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.8}>
              <Image
                source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
                style={styles.poster}
              />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#121212",
  },
  backBtn: { paddingRight: 10 },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B2B2B",
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: { marginRight: 6 },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  centered: {
    flex: 1,
    justify: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyText: {
    color: "#737373",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  gridContainer: {
    padding: 6,
  },
  card: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH * 1.5,
    margin: 4,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#181818",
  },
  poster: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});
