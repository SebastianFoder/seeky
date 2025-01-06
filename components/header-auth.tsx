"use client";

import { signOutAction } from "@/app/actions";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { accountService } from "@/services/accountService";
import { Settings, LogOut, MonitorUp, MonitorCog } from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Account } from "@/types/account";
import { useAvatar } from "@/app/context/AvatarContext";

export default function AuthButton() {
  const { avatarUrl, setAvatarUrl } = useAvatar();
  const supabase = createClient();
  const [account, setAccount] = useState<Account | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(prev => !prev);

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: {session} } = await supabase.auth.getSession();
      if(session?.user){
        const account = await accountService.getAccountByUid(supabase, session.user.id);
        setAccount(account);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if(account){
      setAvatarUrl(account.avatar_url);
    }
  }, [account]);

  if(!account){
    return (
      <>
        <Link className="btn btn-primary shadow" href="/sign-in">Sign in</Link>
        <Link className="btn btn-dark-primary shadow" href="/sign-up">Sign up</Link>
      </>
    );
  }

  return (
    <div className="dropdown" ref={dropdownRef}>
      <input
        type="checkbox"
        id="dropdown-toggle"
        className="dropdown-toggle"
        checked={isOpen}
        onChange={toggleDropdown}
      />
      <label htmlFor="dropdown-toggle" className="avatar">
        <Image
          className="avatar"
          src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_DOMAIN}/${avatarUrl}` || 'img/avatar-default.jpg'}
          alt={account.display_name}
          width={52}
          height={52}
        />
      </label>
      {isOpen && (
        <div className="dropdown-content">
          <Link href="/protected" className="menu-item">
            <Settings />
            Settings
          </Link>
          <div className="divider" />
          <Link href="/videos/upload" className="menu-item">
            <MonitorUp />
            Upload
          </Link>
          <div className="divider" />
          <Link href="/protected/video-management" className="menu-item">
            <MonitorCog />
            Manage Videos
          </Link>
          <div className="divider" />
          <form className="signout-menu-form" action={signOutAction}>
            <button type="submit" className="menu-item">
              <LogOut />
              Sign out
            </button>
          </form>
          <div className="divider" />
          <ThemeSwitcher />
        </div>
      )}
    </div>
  );
}
