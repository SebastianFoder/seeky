import HeaderAuth from "@/components/header-auth";
import { HeaderScroll } from "@/components/header-scroll";

export default function Header() {
    return (
        <HeaderScroll>
            <nav>
                <ul>
                    <li className="logo">
                        <h1><a href="/">Seeky</a></h1>
                    </li>
                    <li className="auth-button-container">
                        <HeaderAuth />
                    </li>
                </ul>
            </nav>
        </HeaderScroll>
    );
}
