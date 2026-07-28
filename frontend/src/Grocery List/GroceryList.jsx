import { Fragment, useEffect, useState } from "react";
import "./GroceryList.css";
import AnimatedCheckbox from "./card.jsx";
import Footer from "../Footer/Footer.jsx";
import { getGroceries } from "../lib/api";

export default function GroceryList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadGroceries() {
            try {
                setLoading(true);
                setError("");

                const result = await getGroceries();
                const normalized = (result.data || []).map(
                    ({ ingredient_id, ingredient, unlock_count, recipe_count }) => ({
                        id: ingredient_id || ingredient,
                        unlockCount: unlock_count,
                        label: unlock_count > 0
                            ? `${ingredient} (unlocks ${unlock_count} recipe${unlock_count === 1 ? "" : "s"})`
                            : `${ingredient} (shows up in ${recipe_count} recipe${recipe_count === 1 ? "" : "s"})`,
                    })
                );

                if (!cancelled) setItems(normalized);
            } catch (err) {
                console.error("Failed to load grocery list", err);
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadGroceries();
        return () => { cancelled = true; };
    }, []);

    const dividerIndex = items.findIndex((it) => !it.unlockCount);

    const handleCheck = (id) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
    };

    return (
        <main className="grocery-page">
            <div className="grocery-container">
                <h1 className="grocery-title">🛒 Grocery List</h1>
                <p className="grocery-subtitle">
                    Here are the ingredients our AI recommends you to buy based on your pantry.
                </p>

                {error && <p className="grocery-empty">{error}</p>}

                <div className="grocery-card">
                    {loading ? (
                        <p className="grocery-empty">Loading groceries...</p>
                    ) : items.length === 0 ? (
                        <p className="grocery-empty">Your list is empty.</p>
                    ) : (
                        <ul className="grocery-list">
                            {items.map((item, index) => (
                                <Fragment key={item.id}>
                                    {index === dividerIndex && dividerIndex > 0 && (
                                        <li className="grocery-divider" role="separator">
                                            <span>Other missing ingredients</span>
                                        </li>
                                    )}
                                    <li className="grocery-item">
                                        <AnimatedCheckbox
                                            id={item.id}
                                            label={item.label}
                                            onChange={() => handleCheck(item.id)}
                                        />
                                    </li>
                                </Fragment>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <Footer />
        </main>
    );
}
