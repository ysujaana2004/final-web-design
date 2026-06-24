import { Link } from "react-router-dom";
import Button from "../Buttons/ButtonH";
import waffle from "../assets/pic.png";
import cat from "../assets/cat.png";
import Footer from "../Footer/Footer";


export default function Home() {
    return (
        <main className="home">
            <div className="image-container">
                <img src={waffle} alt="waffle pic" className="main-image" />
            </div>
            <section className="hero">
                <h1 className="hero__title">
                    Your Kitchen Just Got an Upgrade
                </h1>
                <h2 className="features__title">Everything you need for smarter cooking</h2>
                <p className="hero__subtitle">
                    Share your favorite recipes, let AI monitor your pantry ingredients, and
                    get personalized cooking recommendations and grocery lists.
                </p>
                <p className="features__subtitle">
                    From recipe discovery to grocery planning, reciPal uses AI to make your
                    cooking journey effortless and enjoyable.
                </p>

                <div className="image-container-cat">
                    <img src={cat} alt="cat pic" className="cat-image" />
                </div>
                <div className="navbar__actions">
                    <Link to="/login">
                        <Button />
                    </Link>
                </div>

                {/*<div className="hero__cta">
          <Link to="/recipes" className="btn btn--solid">🍲 Explore Recipes</Link>
        </div>*/}

            </section>

            <section className="features">


                <div className="grid">
                    <article className="card">
                        <header className="card__head">
                            <span className="card__icon" aria-hidden>🧾</span>
                            <h3 className="card__title">Recipe Sharing</h3>
                        </header>
                        <p className="card__body">
                            Discover and share amazing recipes with a community of passionate cooks
                        </p>
                        <Link to="/recipes" className="card__action">Browse Recipes</Link>
                    </article>

                    <article className="card">
                        <header className="card__head">
                            <span className="card__icon" aria-hidden>🧰</span>
                            <h3 className="card__title">Smart Pantry</h3>
                        </header>
                        <p className="card__body">
                            AI monitors your ingredients and suggests recipes based on what you have
                        </p>
                        <Link to="/pantry" className="card__action">Manage Pantry</Link>
                    </article>

                    <article className="card">
                        <header className="card__head">
                            <span className="card__icon" aria-hidden>🛒</span>
                            <h3 className="card__title">Grocery Lists</h3>
                        </header>
                        <p className="card__body">
                            Automatically generate shopping lists from your favorite recipes
                        </p>
                        <Link to="/grocery" className="card__action">View Lists</Link>
                    </article>

                </div>
            </section>
            <Footer />
        </main>
    );
}