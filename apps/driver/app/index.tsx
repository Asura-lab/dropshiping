import { useEffect } from "react";
import { Redirect } from "expo-router";
import { storage } from "../lib/storage";
import { useRouter } from "expo-router";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    storage.get("access_token").then((token) => {
      if (token) {
        router.replace("/deliveries");
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  return null;
}
