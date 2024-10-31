"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ensure component is mounted before rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 16;

  const renderIcon = (currentTheme: string) => {
    switch (currentTheme) {
      case "light":
        return <Sun size={ICON_SIZE} className="theme-switcher-icon" />;
      case "dark":
        return <Moon size={ICON_SIZE} className="theme-switcher-icon" />;
      case "system":
        return <Laptop size={ICON_SIZE} className="theme-switcher-icon" />;
      default:
        return <Sun size={ICON_SIZE} className="theme-switcher-icon" />;
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleThemeChange = (selectedTheme: string) => {
    setTheme(selectedTheme);
    setIsOpen(false);
  };

  return (
    <div className="theme-switcher" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="theme-switcher-button"
      >
        {renderIcon(theme ?? "light")}
      </button>

      {isOpen && (
        <div className="theme-switcher-dropdown">
          <button
            onClick={() => handleThemeChange("light")}
            className="theme-switcher-item"
          >
            <Sun size={ICON_SIZE} className="theme-switcher-icon" />
            <span>Light</span>
          </button>
          <button
            onClick={() => handleThemeChange("dark")}
            className="theme-switcher-item"
          >
            <Moon size={ICON_SIZE} className="theme-switcher-icon" />
            <span>Dark</span>
          </button>
          <button
            onClick={() => handleThemeChange("system")}
            className="theme-switcher-item"
          >
            <Laptop size={ICON_SIZE} className="theme-switcher-icon" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
};

export { ThemeSwitcher };
