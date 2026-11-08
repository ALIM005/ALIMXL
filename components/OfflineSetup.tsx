"use client";

import { useEffect, useState } from "react";

export default function OfflineSetup() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Development mode-এ পুরোনো ক্যাশের ঝামেলা এড়াতে বন্ধ।

    if (process.env.NODE_ENV !== "production") {
      // Dev মোডে আগে রেজিস্টার হওয়া পুরোনো SW ও cache সরিয়ে ফেলা হচ্ছে
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    if (!("serviceWorker" in navigator)) {
      setMessage(
        "এই ব্রাউজারে অফলাইন অ্যাপের সুবিধা সমর্থিত নয়।"
      );
      return;
    }

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let installingWorker: ServiceWorker | null = null;

    const showMessage = (text: string) => {
      if (!disposed) {
        setMessage(text);
      }
    };

    const handleStateChange = () => {
      if (installingWorker?.state !== "installed") {
        return;
      }

      if (navigator.serviceWorker.controller) {
        showMessage(
          "নতুন সংস্করণ পাওয়া গেছে। কাজ সেভ করে অ্যাপের সব উইন্ডো বন্ধ করে আবার খুলুন।"
        );
      } else {
        showMessage(
          "অফলাইন ক্যাশ শুরু হয়েছে। অনলাইনে একবার রিলোড করে প্রয়োজনীয় ফিচারগুলো ব্যবহার করুন।"
        );
      }
    };

    const watchInstallingWorker = () => {
      installingWorker?.removeEventListener(
        "statechange",
        handleStateChange
      );

      installingWorker = registration?.installing ?? null;

      installingWorker?.addEventListener(
        "statechange",
        handleStateChange
      );

      handleStateChange();
    };

    const setup = async () => {
      try {
        registration = await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
            updateViaCache: "none",
          }
        );

        if (disposed) {
          return;
        }

        if (registration.waiting) {
          showMessage(
            "নতুন সংস্করণ পাওয়া গেছে। কাজ সেভ করে অ্যাপের সব উইন্ডো বন্ধ করে আবার খুলুন।"
          );
        }

        registration.addEventListener(
          "updatefound",
          watchInstallingWorker
        );

        watchInstallingWorker();

        await registration.update();
      } catch (error) {
        console.error("ALIMXL offline setup failed:", error);

        showMessage(
          "অফলাইন সেটআপ সম্পন্ন হয়নি। ইন্টারনেট সংযোগ রেখে আবার চেষ্টা করুন।"
        );
      }
    };

    void setup();

    return () => {
      disposed = true;

      registration?.removeEventListener(
        "updatefound",
        watchInstallingWorker
      );

      installingWorker?.removeEventListener(
        "statechange",
        handleStateChange
      );
    };
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 16,
        bottom: 64,
        zIndex: 10000,
        maxWidth: 360,
        padding: 14,
        border: "1px solid #b8d8f0",
        borderRadius: 10,
        background: "#ffffff",
        color: "#16324f",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <span>{message}</span>

      <button
        type="button"
        onClick={() => setMessage("")}
        aria-label="বার্তা বন্ধ করুন"
        style={{
          marginLeft: 12,
          border: 0,
          background: "transparent",
          color: "#106ebe",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        বন্ধ করুন
      </button>
    </div>
  );
}