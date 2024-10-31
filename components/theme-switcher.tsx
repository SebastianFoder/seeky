"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 16;

  return (
    <>
    <button>
          {theme === "light" ? (
            <Sun
              key="light"
              size={ICON_SIZE}
              className={"text-muted-foreground"}
            />
          ) : theme === "dark" ? (
            <Moon
              key="dark"
              size={ICON_SIZE}
              className={"text-muted-foreground"}
            />
          ) : (
            <Laptop
              key="system"
              size={ICON_SIZE}
              className={"text-muted-foreground"}
            />
          )}
      </button>
      <Sun size={ICON_SIZE} onClick={() => setTheme("light")}/>{" "}
      <span>Light</span>
      <Moon size={ICON_SIZE} onClick={() => setTheme("dark")}/>{" "}
      <span>Dark</span>
      <Laptop size={ICON_SIZE} onClick={() => setTheme("system")}/>{" "}
      <span>System</span>
    </>
  );
};

export { ThemeSwitcher };
