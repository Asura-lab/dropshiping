import { useEffect } from "react";
import { useRouter } from "expo-router";
import { storage } from "../lib/storage";

export default function IndexPage() {
  const router = useRouter();
  useEffect(() => {
    storage.get("access_token").then((token) => {
      router.replace(token ? "/(tabs)" : "/login");
    });
  }, [router]);
  return null;
}
