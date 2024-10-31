import { ThemeSwitcher } from "@/components/theme-switcher";
import HeaderAuth from "@/components/header-auth";

export default function Header() {
    return (
        <header>
            <nav>
                <ul>
                    <li className="theme-switcher-container">
                        <ThemeSwitcher />
                        <span>Theme</span>
                    </li>
                    <li className="auth-button-container">
                        <HeaderAuth />
                    </li>
                </ul>
            </nav>
        </header>
    );
}
