import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const TMDB_API_KEY = "ddf5724768b00aee5a7630ebe654913d";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const ORIGINAL_IMAGE_URL = "https://image.tmdb.org/t/p/original";

const endpoints = {
  trending: `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`,
  topRated: `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}`,
  action: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28`,
};

const GENRES = [
  { id: null, name: "All" },
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 878, name: "Sci-Fi" },
  { id: 27, name: "Horror" },
  { id: 16, name: "Animation" },
];

const fetchMovies = async (url: string) => {
  try {
    const res = await axios.get(url);
    return res.data.results || [];
  } catch {
    return [];
  }
};

const fetchMovieTrailer = async (id: number) => {
  try {
    const res = await axios.get(
      `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_API_KEY}`,
    );
    const trailer = res.data.results.find(
      (v: any) => v.type === "Trailer" && v.site === "YouTube",
    );
    return trailer ? trailer.key : null;
  } catch {
    return null;
  }
};

export default function App() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroMovies, setHeroMovies] = useState<any[]>([]);
  const [heroMovie, setHeroMovie] = useState<any>(null);
  const [heroTrailerKey, setHeroTrailerKey] = useState<string | null>(null);
  const [heroCountdown, setHeroCountdown] = useState(20);

  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [action, setAction] = useState([]);
  const [loading, setLoading] = useState(true);

  // User & Profile States
  const [userAccount, setUserAccount] = useState<{ email: string } | null>(
    null,
  );
  const [currentProfile, setCurrentProfile] = useState<"Main" | "Kids">("Main");
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Settings
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [videoQuality, setVideoQuality] = useState("Auto");

  // Collections
  const [myList, setMyList] = useState<any[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);

  // Genres & Search
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [genreMovies, setGenreMovies] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Sorting
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<"popularity" | "rating" | "release">(
    "popularity",
  );

  // Modals & Details
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [modalTrailerKey, setModalTrailerKey] = useState<string | null>(null);
  const [director, setDirector] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [cast, setCast] = useState<{ id: number; name: string }[]>([]);
  const [playingMovie, setPlayingMovie] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const [t, tr, a] = await Promise.all([
        fetchMovies(endpoints.trending),
        fetchMovies(endpoints.topRated),
        fetchMovies(endpoints.action),
      ]);
      setTrending(t);
      setTopRated(tr);
      setAction(a);

      if (t.length > 0) {
        const valids = t.filter((m: any) => m.backdrop_path || m.poster_path);
        setHeroMovies(valids);
        setHeroMovie(valids[0]);
      }

      loadStoredData();
      setLoading(false);
    }
    loadData();
  }, []);

  // 20-SECOND TIMER FOR HERO BANNER AUTO-NEXT
  useEffect(() => {
    if (heroMovies.length === 0 || playingMovie || selectedMovie) return;

    const timer = setInterval(() => {
      setHeroCountdown((prev) => {
        if (prev <= 1) {
          setHeroIndex(
            (nextIdx) => (nextIdx + 1) % Math.min(heroMovies.length, 10),
          );
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [heroMovies, playingMovie, selectedMovie]);

  // FETCH TRAILER WHEN HERO MOVIE CHANGES
  useEffect(() => {
    if (heroMovies.length > 0) {
      const current = heroMovies[heroIndex];
      setHeroMovie(current);
      setHeroTrailerKey(null);
      setHeroCountdown(20);
      fetchMovieTrailer(current.id).then((key) => setHeroTrailerKey(key));
    }
  }, [heroIndex, heroMovies]);

  const loadStoredData = () => {
    if (typeof window === "undefined") return;
    const user = localStorage.getItem("@zpk_user_account");
    const list = localStorage.getItem("@zpk_mylist");
    const cw = localStorage.getItem("@zpk_continue_watching");

    if (user) setUserAccount(JSON.parse(user));
    if (list) setMyList(JSON.parse(list));
    if (cw) setContinueWatching(JSON.parse(cw));
  };

  // SEARCH & SORT HANDLER
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
            searchQuery,
          )}`,
        );
        let results = res.data.results.filter((m: any) => m.poster_path);

        results.sort((a: any, b: any) => {
          if (sortBy === "rating")
            return (b.vote_average || 0) - (a.vote_average || 0);
          if (sortBy === "release")
            return (
              new Date(b.release_date).getTime() -
              new Date(a.release_date).getTime()
            );
          return (b.popularity || 0) - (a.popularity || 0);
        });

        setSearchResults(results);
      } catch (e) {
        console.error(e);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, sortBy]);

  const handleSaveAccount = () => {
    if (!authEmail.trim()) return;
    const userData = { email: authEmail.trim() };
    setUserAccount(userData);
    if (typeof window !== "undefined") {
      localStorage.setItem("@zpk_user_account", JSON.stringify(userData));
    }
    setAuthModalVisible(false);
    setAuthEmail("");
    setAuthPassword("");
  };

  const handleLogout = () => {
    setUserAccount(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("@zpk_user_account");
    }
    setProfileMenuVisible(false);
  };

  const handleClearCache = () => {
    setContinueWatching([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("@zpk_continue_watching");
    }
    alert("Watch history cleared!");
    setSettingsModalVisible(false);
  };

  const handleSelectMovie = (movie: any) => {
    setSelectedMovie(movie);
    setModalTrailerKey(null);
    setDirector(null);
    setCast([]);

    fetchMovieTrailer(movie.id).then((key) => setModalTrailerKey(key));

    axios
      .get(
        `https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`,
      )
      .then((res) => {
        const crew = res.data.crew || [];
        const castList = res.data.cast || [];
        const dir = crew.find((m: any) => m.job === "Director");
        if (dir) setDirector({ id: dir.id, name: dir.name });
        setCast(
          castList.slice(0, 5).map((c: any) => ({ id: c.id, name: c.name })),
        );
      });
  };

  const handleStartWatching = (movie: any) => {
    if (!userAccount) {
      setAuthModalVisible(true);
      return;
    }
    let updated = [...continueWatching];
    const existingIndex = updated.findIndex((m) => m.id === movie.id);
    if (existingIndex >= 0) updated.splice(existingIndex, 1);
    updated.unshift(movie);

    setContinueWatching(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("@zpk_continue_watching", JSON.stringify(updated));
    }
    setSelectedMovie(null);
    setPlayingMovie(movie);
  };

  const toggleMyList = (movie: any) => {
    let updated = [...myList];
    if (updated.some((m) => m.id === movie.id)) {
      updated = updated.filter((m) => m.id !== movie.id);
    } else {
      updated.push(movie);
    }
    setMyList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("@zpk_mylist", JSON.stringify(updated));
    }
  };

  const handleSelectGenre = async (genreId: number | null) => {
    setSelectedGenre(genreId);
    if (!genreId) {
      setGenreMovies([]);
      return;
    }
    const res = await axios.get(
      `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}`,
    );
    setGenreMovies(res.data.results || []);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={{ color: "#FFF", marginTop: 10 }}>Loading ZPK-MAX...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* NAVBAR */}
      <View style={styles.navbar}>
        <Text style={styles.logoText}>ZPK-MAX</Text>
        <View style={styles.navIcons}>
          <TouchableOpacity onPress={() => setIsSearching(!isSearching)}>
            <Ionicons
              name="search"
              size={22}
              color="#FFF"
              style={{ marginRight: 15 }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSettingsModalVisible(true)}>
            <Ionicons
              name="settings-outline"
              size={22}
              color="#FFF"
              style={{ marginRight: 15 }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              userAccount
                ? setProfileMenuVisible(true)
                : setAuthModalVisible(true)
            }
          >
            <Ionicons
              name="person-circle-outline"
              size={26}
              color={userAccount ? "#E50914" : "#FFF"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH BAR */}
      {isSearching && (
        <View style={styles.searchBarContainer}>
          <TextInput
            placeholder="Search movies..."
            placeholderTextColor="#888"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={styles.filterButton}
          >
            <Ionicons name="options-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* GENRES BAR */}
      {!isSearching && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.genreContainer}
        >
          {GENRES.map((genre) => (
            <TouchableOpacity
              key={genre.name}
              onPress={() => handleSelectGenre(genre.id)}
              style={[
                styles.genreBadge,
                selectedGenre === genre.id && styles.activeGenreBadge,
              ]}
            >
              <Text style={styles.genreText}>{genre.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* MAIN GRID OR HOME BANNER */}
      {(isSearching && searchQuery.length > 0) || selectedGenre ? (
        <View style={styles.gridContainer}>
          {(selectedGenre ? genreMovies : searchResults).map((movie) => (
            <TouchableOpacity
              key={movie.id}
              onPress={() => handleSelectMovie(movie)}
              style={styles.gridCard}
            >
              <Image
                source={{
                  uri: movie.poster_path
                    ? `${IMAGE_BASE_URL}${movie.poster_path}`
                    : "https://via.placeholder.com/150",
                }}
                style={styles.gridImage}
              />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <>
          {/* HERO BANNER WITH VIDEO PREVIEW & TIMER */}
          {heroMovie && (
            <View style={styles.heroContainer}>
              {heroTrailerKey && typeof window !== "undefined" ? (
                <iframe
                  src={`https://www.youtube.com/embed/${heroTrailerKey}?autoplay=1&mute=1&controls=0&loop=1`}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: 0,
                    pointerEvents: "none",
                  }}
                  allow="autoplay"
                />
              ) : (
                <Image
                  source={{
                    uri: `${ORIGINAL_IMAGE_URL}${
                      heroMovie.backdrop_path || heroMovie.poster_path
                    }`,
                  }}
                  style={styles.heroImage}
                />
              )}

              {/* TIMER BADGE */}
              <View style={styles.timerBadge}>
                <Ionicons name="time-outline" size={12} color="#FFF" />
                <Text style={styles.timerText}> Next in {heroCountdown}s</Text>
              </View>

              <View style={styles.heroOverlay}>
                <Text style={styles.heroTitle}>
                  {heroMovie.title || heroMovie.name}
                </Text>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => handleStartWatching(heroMovie)}
                >
                  <Ionicons name="play" size={18} color="#000" />
                  <Text style={styles.playButtonText}> Play</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* MOVIE ROWS */}
          <View style={{ paddingBottom: 40 }}>
            {continueWatching.length > 0 && (
              <MovieRow
                title="Continue Watching"
                data={continueWatching}
                onSelect={handleSelectMovie}
              />
            )}
            {myList.length > 0 && (
              <MovieRow
                title="My List"
                data={myList}
                onSelect={handleSelectMovie}
              />
            )}
            <MovieRow
              title="Trending Now"
              data={trending}
              onSelect={handleSelectMovie}
            />
            <MovieRow
              title="Top Rated"
              data={topRated}
              onSelect={handleSelectMovie}
            />
            <MovieRow
              title="Action Thrillers"
              data={action}
              onSelect={handleSelectMovie}
            />
          </View>
        </>
      )}

      {/* MOVIE DETAILS MODAL WITH VIDEO TRAILER PREVIEW */}
      <Modal visible={!!selectedMovie} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMovie && (
              <>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedMovie(null)}
                >
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>

                {/* VIDEO TRAILER PREVIEW */}
                <View style={styles.trailerBox}>
                  {modalTrailerKey && typeof window !== "undefined" ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${modalTrailerKey}?autoplay=1`}
                      style={{ width: "100%", height: 200, border: 0 }}
                      allow="autoplay"
                    />
                  ) : (
                    <Image
                      source={{
                        uri: `${IMAGE_BASE_URL}${selectedMovie.poster_path}`,
                      }}
                      style={styles.modalImage}
                    />
                  )}
                </View>

                <Text style={styles.modalTitle}>{selectedMovie.title}</Text>
                <Text style={{ color: "#FFD700", marginBottom: 5 }}>
                  ⭐ {selectedMovie.vote_average?.toFixed(1)}
                </Text>
                <Text style={styles.modalOverview}>
                  {selectedMovie.overview}
                </Text>

                {director && (
                  <Text
                    style={{ color: "#AAA", fontSize: 12, marginBottom: 4 }}
                  >
                    Director:{" "}
                    <Text style={{ color: "#FFF" }}>{director.name}</Text>
                  </Text>
                )}
                {cast.length > 0 && (
                  <Text
                    style={{ color: "#AAA", fontSize: 12, marginBottom: 15 }}
                  >
                    Cast: {cast.map((c) => c.name).join(", ")}
                  </Text>
                )}

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handleStartWatching(selectedMovie)}
                  >
                    <Ionicons name="play" size={18} color="#000" />
                    <Text style={styles.playButtonText}> Watch Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.playButton, { backgroundColor: "#333" }]}
                    onPress={() => toggleMyList(selectedMovie)}
                  >
                    <Ionicons
                      name={
                        myList.some((m) => m.id === selectedMovie.id)
                          ? "bookmark"
                          : "bookmark-outline"
                      }
                      size={18}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* FILTER & SORT MODAL */}
      <Modal visible={filterModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sort Movies</Text>
            <View style={{ flexDirection: "row", gap: 5, marginVertical: 15 }}>
              {(["popularity", "rating", "release"] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setSortBy(option)}
                  style={[
                    styles.genreBadge,
                    sortBy === option && styles.activeGenreBadge,
                  ]}
                >
                  <Text style={{ color: "#FFF", fontSize: 12 }}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.playButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ACCOUNT MODAL */}
      <Modal visible={authModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAuthModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sign In / Register</Text>
            <TextInput
              placeholder="Email address"
              placeholderTextColor="#888"
              style={[
                styles.searchInput,
                { width: "100%", marginVertical: 10 },
              ]}
              value={authEmail}
              onChangeText={setAuthEmail}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#888"
              secureTextEntry
              style={[styles.searchInput, { width: "100%", marginBottom: 15 }]}
              value={authPassword}
              onChangeText={setAuthPassword}
            />
            <TouchableOpacity
              style={styles.playButton}
              onPress={handleSaveAccount}
            >
              <Text style={styles.playButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PROFILE & ACCOUNT SETTINGS MODAL */}
      <Modal visible={profileMenuVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setProfileMenuVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Account Settings</Text>

            {/* PROFILE SWITCHER */}
            <Text
              style={{
                color: "#AAA",
                fontSize: 12,
                marginTop: 10,
                alignSelf: "flex-start",
              }}
            >
              Switch Profile:
            </Text>
            <View style={{ flexDirection: "row", gap: 15, marginVertical: 12 }}>
              <TouchableOpacity
                onPress={() => setCurrentProfile("Main")}
                style={[
                  styles.profileBox,
                  currentProfile === "Main" && styles.activeProfileBox,
                ]}
              >
                <Ionicons name="person-circle" size={36} color="#E50914" />
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 12,
                    fontWeight: "bold",
                    marginTop: 4,
                  }}
                >
                  Main
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCurrentProfile("Kids")}
                style={[
                  styles.profileBox,
                  currentProfile === "Kids" && styles.activeProfileBox,
                ]}
              >
                <Ionicons name="happy" size={36} color="#00D2FF" />
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 12,
                    fontWeight: "bold",
                    marginTop: 4,
                  }}
                >
                  Kids
                </Text>
              </TouchableOpacity>
            </View>

            {/* USER INFO CARD */}
            <View style={styles.accountInfoCard}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color="#AAA"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ color: "#FFF", fontSize: 13, fontWeight: "500" }}
                >
                  {userAccount?.email}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color="#4CD964"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ color: "#4CD964", fontSize: 12, fontWeight: "bold" }}
                >
                  Free Forever (Ad-Free Access)
                </Text>
              </View>
            </View>

            {/* SIGN OUT BUTTON */}
            <TouchableOpacity
              style={[
                styles.playButton,
                {
                  backgroundColor: "#E50914",
                  width: "100%",
                  justify: "center",
                  marginTop: 10,
                },
              ]}
              onPress={handleLogout}
            >
              <Ionicons
                name="log-out-outline"
                size={18}
                color="#FFF"
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal visible={settingsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Settings</Text>
            <Text style={{ color: "#AAA", marginTop: 10 }}>
              Video Quality: {videoQuality}
            </Text>
            <TouchableOpacity
              style={[
                styles.playButton,
                { backgroundColor: "#333", marginTop: 15 },
              ]}
              onPress={handleClearCache}
            >
              <Text style={{ color: "#FF3B30", fontWeight: "bold" }}>
                Clear Watch History
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FULLSCREEN PLAYER */}
      {playingMovie && (
        <Modal visible={true} animationType="fade">
          <View style={styles.playerContainer}>
            <TouchableOpacity
              style={styles.closePlayerButton}
              onPress={() => setPlayingMovie(null)}
            >
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
            {typeof window !== "undefined" && (
              <iframe
                src={`https://vidsrc.to/embed/movie/${playingMovie.id}`}
                style={{ width: "100%", height: "100%", border: 0 }}
                allowFullScreen
              />
            )}
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const MovieRow = ({ title, data, onSelect }: any) => (
  <View style={{ marginTop: 20, paddingLeft: 15 }}>
    <Text style={styles.rowTitle}>{title}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {data.map((movie: any) => (
        <TouchableOpacity key={movie.id} onPress={() => onSelect(movie)}>
          <Image
            source={{ uri: `${IMAGE_BASE_URL}${movie.poster_path}` }}
            style={styles.cardImage}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#141414" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#141414",
    justifyContent: "center",
    alignItems: "center",
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#000",
  },
  logoText: { color: "#E50914", fontSize: 22, fontWeight: "bold" },
  navIcons: { flexDirection: "row", alignItems: "center" },
  searchBarContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#222",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#333",
    color: "#FFF",
    padding: 8,
    borderRadius: 5,
  },
  filterButton: { marginLeft: 10, padding: 8 },
  genreContainer: { paddingVertical: 10, paddingLeft: 15 },
  genreBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  activeGenreBadge: { backgroundColor: "#E50914" },
  genreText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  heroContainer: {
    height: 350,
    width: "100%",
    position: "relative",
    backgroundColor: "#000",
  },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: { position: "absolute", bottom: 20, left: 15, zIndex: 10 },
  heroTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  timerBadge: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  timerText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 5,
  },
  playButtonText: { color: "#000", fontWeight: "bold" },
  rowTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  cardImage: { width: 120, height: 170, borderRadius: 5, marginRight: 10 },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    justifyContent: "space-between",
  },
  gridCard: { width: "30%", marginBottom: 15 },
  gridImage: { width: "100%", height: 160, borderRadius: 5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#181818",
    width: "90%",
    maxWidth: 480,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  trailerBox: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 15,
    alignItems: "center",
  },
  modalImage: { width: 140, height: 200, borderRadius: 5 },
  modalTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  modalOverview: {
    color: "#AAA",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 15,
  },
  closeButton: { position: "absolute", top: 10, right: 10, zIndex: 20 },
  playerContainer: { flex: 1, backgroundColor: "#000" },
  closePlayerButton: { position: "absolute", top: 20, right: 20, zIndex: 999 },

  // ADDED ACCOUNT STYLES
  profileBox: {
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#222",
    width: 80,
  },
  activeProfileBox: {
    borderColor: "#E50914",
    backgroundColor: "#2A2A2A",
  },
  accountInfoCard: {
    backgroundColor: "#222",
    width: "100%",
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
});
