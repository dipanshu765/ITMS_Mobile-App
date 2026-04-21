import { ResizeMode, Video } from "expo-av";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface StartupVideoScreenProps {
  onFinished: () => void;
}

export default function StartupVideoScreen({ onFinished }: StartupVideoScreenProps) {
  const finishedRef = useRef(false);

  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished();
  };

  useEffect(() => {
    const fallback = setTimeout(handleFinish, 50000);
    return () => clearTimeout(fallback);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Video
          source={require("../../assets/welcom_view.mp4")}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping={false}
          useNativeControls={false}
          onPlaybackStatusUpdate={(status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) handleFinish();
          }}
          onError={handleFinish}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  video: {
    width: "92%",
    aspectRatio: 9 / 16,
    maxHeight: "92%",
  },
});
