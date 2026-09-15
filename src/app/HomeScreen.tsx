import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";
import {
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

const { width, height } = Dimensions.get("window");

// Movie Interface with Video Details
interface Movie {
  id: string;
  title: string;
  poster: string;
  description: string;
  videoUrl: string;
  isTop10?: boolean;
}

const CATEGORIES: { title: string; data: Movie[] }[] = [
  {
    title: "Trending Now",
    data: [
      {
        id: "1",
        title: "Cyber Runner",
        poster: "https://picsum.photos/300/450?random=1",
        description:
          "A rogue hacker uncovers a dark corporate secret in a futuristic metropolis.",
        videoUrl:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      },
      {
        id: "2",
        title: "Deep Space",
        poster: "https://picsum.photos/300/450?random=2",
        description:
          "Astronauts stranded on an uncharted moon face an ancient alien threat.",
        videoUrl:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      },
    ],
  },
  {
    title: "Top 10 Picks for You",
    data: [
      {
        id: "3",
        title: "Shadow Realm",
        poster: "https://picsum.photos/300/450?random=3",
        description:
          "A warrior navigates parallel dimensions to rescue his lost guild.",
        videoUrl:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        isTop10: true,
      },
    ],
  },
];

// Reusable Video Component for Modal
function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <VideoView
      style={styles.modalVideo}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

export default function HomeScreen() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Main Movie List Feed */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {CATEGORIES.map((category) => (
          <View key={category.title} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <FlatList
              data={category.data}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingLeft: 12 }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.cardContainer}
                  activeOpacity={0.8}
                  onPress={() => setSelectedMovie(item)} // Open Preview Modal
                >
                  <Image
                    source={{ uri: item.poster }}
                    style={styles.posterImage}
                  />
                  {item.isTop10 && (
                    <View style={styles.top10Badge}>
                      <Text style={styles.top10BadgeText}>
                        TOP 10 #{index + 1}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        ))}
      </ScrollView>

      {/* --- MOVIE PREVIEW MODAL --- */}
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
                {/* Embedded Video Trailer */}
                <View style={styles.videoWrapper}>
                  <VideoPlayer videoUrl={selectedMovie.videoUrl} />
                </View>

                {/* Details Section */}
                <View style={styles.detailsContainer}>
                  <Text style={styles.modalTitle}>{selectedMovie.title}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.matchText}>98% Match</Text>
                    <Text style={styles.badgeText}>HD</Text>
                    <Text style={styles.badgeText}>13+</Text>
                  </View>

                  <Text style={styles.description}>
                    {selectedMovie.description}
                  </Text>

                  {/* Play Action Button */}
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
  categoryContainer: { marginTop: 20 },
  categoryTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    paddingLeft: 16,
  },
  cardContainer: { marginRight: 10, position: "relative" },
  posterImage: {
    width: 120,
    height: 180,
    borderRadius: 6,
    backgroundColor: "#1C1C1C",
  },
  top10Badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#E50914",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  top10BadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },

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
  modalVideo: { width: "100%", height: "100%" },
  detailsContainer: { padding: 20 },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 24,
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
