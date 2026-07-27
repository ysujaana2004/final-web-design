import React, { useEffect, useState } from "react";
import "./GroceryList.css";
import AnimatedCheckbox from "./card.jsx";
import Footer from "../Footer/Footer.jsx";
import { getGroceries } from "../lib/api.js";

export default function GroceryList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await getGroceries();
                const normalized = (data || []).map((grocery) => ({
                    id: grocery.ingredient_id || grocery.ingredient,
                    label: grocery.unlock_count > 0
                        ? `${grocery.ingredient} (unlocks ${grocery.unlock_count} recipe${grocery.unlock_count === 1 ? "" : "s"})`
                        : grocery.ingredient,
                }));
                if (!cancelled) setItems(normalized);
            } catch (err) {
                console.error("Failed to load grocery list", err);
                if (!cancelled) setError(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

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

                <div className="grocery-card">
                    {loading ? (
                        <p className="grocery-empty">Loading…</p>
                    ) : error ? (
                        <p className="grocery-empty">Failed to load: {String(error.message || error)}</p>
                    ) : items.length === 0 ? (
                        <p className="grocery-empty">Your list is empty.</p>
                    ) : (
                        <ul className="grocery-list">
                            {items.map((item) => (
                                <li key={item.id} className="grocery-item">
                                    <AnimatedCheckbox
                                        id={item.id}
                                        label={item.label}
                                        onChange={() => handleCheck(item.id)}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <Footer />
        </main>
    );
}
