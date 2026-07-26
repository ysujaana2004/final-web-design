import React, { useEffect, useState } from "react";
import "./GroceryList.css";
import AnimatedCheckbox from "./card.jsx";
import Footer from "../Footer/Footer.jsx";
// import { getRecommendations } from "../../api_funcs/grocery.js";
const getRecommendations = async () => {
    return [
        { ingredient: "milk", unlocks: 2 },
        { ingredient: "eggs", unlocks: 1 }
    ];
};


// Call the grocery reccoemdmnder logic from api_funcs/grocery.js (which calls the backend - grocery.py)
export default function GroceryList() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const recommended = await getRecommendations();
                const normalized = recommended.map(({ ingredient, unlocks }) => ({
                    id: ingredient,
                    label: `${ingredient} (unlocks ${unlocks} recipe${unlocks === 1 ? "" : "s"})`,
                }));
                if (!cancelled) setItems(normalized);

            } catch (err) {
                console.error("Failed to load grocery list", err);
                if (!cancelled) setItems([]);
            }
        })();
        return () => { cancelled = true; };
    }, []);


    // Display fake data
    useEffect(() => {
        async function load() {
            const recommended = [
                { id: "milk", label: "Whole milk (1 gal)" },
                { id: "eggs", label: "Eggs (dozen)" },
                { id: "pasta", label: "Spaghetti pasta" },
                { id: "tomato-sauce", label: "Tomato sauce" },

                // EXTRA FAKE TEST DATA
                { id: "bread", label: "Whole wheat bread" },
                { id: "butter", label: "Salted butter" },
                { id: "rice", label: "Long grain rice" },
                { id: "chicken", label: "Chicken breast (2 lb)" },
                { id: "apples", label: "Apples (6 pack)" },
                { id: "spinach", label: "Fresh spinach (1 bag)" }
            ];

            setItems(recommended);
        }
        load();
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
                    {items.length === 0 ? (
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
        </main>
    );
    <Footer />
}
