import { Link, NavLink } from "react-router-dom";
import "../Home/Home.css";
import bread from "../assets/bread.png";
import Button from "../Buttons/Button";

export default function Navbar() {
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
                    <Link to="/login">
                        <Button />
                    </Link>

                </div>
            </div>
        </header>

    );
}
