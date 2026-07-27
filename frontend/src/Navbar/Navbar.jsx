import { Link, NavLink, useNavigate } from "react-router-dom";
import "../Home/Home.css";
import bread from "../assets/bread.png";
import Button from "../Buttons/Button";
import { useAuth } from "../auth/useAuth";

export default function Navbar() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    const handleSignOut = async () => {
        const { error } = await signOut();

        if (!error) {
            navigate("/", { replace: true });
        }
    };

    return (
        <header className="navbar">
            <div className="navbar__container">
                <Link to="/" className="navbar__brand">
                    <img src={bread} alt="Bread Icon" className="login-image" />
                    <span className="navbar__name">reciPal</span>
                </Link>
                <nav className="navbar__nav">
                    <NavLink to="/" end className="navbar__link">
                        Home
                    </NavLink>
                    <NavLink to="/recipes" className="navbar__link">
                        Recipes
                    </NavLink>
                    <NavLink to="/pantry" className="navbar__link">
                        Pantry
                    </NavLink>
                    <NavLink to="/grocery" className="navbar__link">
                        Grocery List
                    </NavLink>
                    <NavLink to="/dashboard" className="navbar__link">
                        Dashboard
                    </NavLink>
                </nav>
                <div className="navbar__actions">
                    {user ? (
                        <button className="btn" type="button" onClick={handleSignOut}>
                            Log out
                        </button>
                    ) : (
                        <Link to="/login">
                            <Button />
                        </Link>
                    )}

                </div>
            </div>
        </header>

    );
}
