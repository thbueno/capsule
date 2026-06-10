import { PickedImage } from "@/types";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";
import { supabase } from "./supabase";

/** Open the photo library and return the selected images. */
export async function pickImages(limit = 5): Promise<PickedImage[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Permission needed", "Photo library access is required to share pictures.");
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.7,
    // The native upload path goes through base64 → ArrayBuffer; web uses the
    // blob from the asset URI directly.
    base64: Platform.OS !== "web",
  });

  if (result.canceled) return [];

  return result.assets.slice(0, limit).map((asset) => ({
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
  }));
}

function fileExtension(image: PickedImage): string {
  const fromMime = image.mimeType?.split("/")[1];
  if (fromMime) return fromMime === "jpeg" ? "jpg" : fromMime;
  const fromUri = image.uri.split(".").pop()?.toLowerCase();
  if (fromUri && ["jpg", "jpeg", "png", "gif", "webp"].includes(fromUri)) {
    return fromUri === "jpeg" ? "jpg" : fromUri;
  }
  return "jpg";
}

/**
 * Upload one picked image into a bucket under the given folder.
 * Returns the object path within the bucket.
 */
export async function uploadImage(
  bucket: string,
  folder: string,
  image: PickedImage,
  options?: { upsert?: boolean; fileName?: string }
): Promise<string> {
  const ext = fileExtension(image);
  const name = options?.fileName ?? `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${folder}/${name}`;

  let body: Blob | ArrayBuffer;
  if (Platform.OS === "web") {
    body = await (await fetch(image.uri)).blob();
  } else {
    if (!image.base64) throw new Error("Image data missing — please pick the photo again.");
    body = decode(image.base64);
  }

  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: image.mimeType ?? "image/jpeg",
    upsert: options?.upsert ?? false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return path;
}
