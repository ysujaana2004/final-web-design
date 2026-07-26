import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createRecipeFromVideo } from "./lib/api";


export default function NewRecipe() {
    const [inputValue, setInputValue] = React.useState("");
    // status: null | 'success' | 'error' | 'pending'
    const [status, setStatus] = React.useState(null);
    const navigate = useNavigate();

    // submitLink returns a boolean (true = success, false = failure)
    const submitLink = async (inputValue) => {
        const link = String(inputValue || "").trim();

        setStatus("pending");
        try {
            await createRecipeFromVideo(link);
            return true;
        } catch (e) {
            return false;
        }
    };
    return (
        <main className="page">
            <div className="page__head container" style={{ alignItems: "center" }}>
                <div>
                    <h1 className="page__title">Add New Recipe</h1>
                    <p className="page__subtitle">
                        Create a new recipe by giving it a title.
                    </p>
                </div>
                <Link to="/recipes" className="btn btn--ghost page__cta">
                    ← Back
                </Link>
            </div>

            <section
                className="container"
                style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}
            >
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        const title = inputValue.trim();
                        if (!title) return; // no-op for empty

                        const ok = await submitLink(title);
                        if (ok) {
                            setStatus("success");
                            setInputValue("");
                            setTimeout(() => navigate("/recipes"), 1000);
                        } else {
                            setStatus("error");
                            setTimeout(() => setStatus(null), 3000);
                        }
                    }}
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        width: "100%",
                        justifyContent: "center",
                    }}
                >
                    <input
                        aria-label="Recipe title"
                        name="title"
                        className="searchbar__input"
                        placeholder="Recipe Link..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        style={{
                            // These styles are derived from the clean search bar on the Pantry page
                            width: "60%", // Keep original width constraint
                            maxWidth: 560, // Keep original max-width constraint

                            // Core styling for the rounded, elevated look
                            display: "flex", // Allows internal alignment if you add an icon later
                            alignItems: "center",
                            border: "1px solid #e0e0e0",
                            borderRadius: "25px", // Rounded corners
                            padding: "0.5rem 1rem", // Internal padding
                            backgroundColor: "#ffffff",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)", // Subtle lift

                            // Reset default input styles
                            outline: "none",
                            fontSize: "1rem",
                            color: "#bf2929ff",

                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            // Emulating the .btn--solid look:
                            padding: "0.6rem 1.2rem", // Slightly larger padding than 10px 18px
                            borderRadius: "8px", // Consistent rounded corners
                            fontWeight: "600",
                            cursor: "pointer",

                            // Dynamic background color logic, using 'var(--accent)' as the neutral fallback
                            backgroundColor:
                                status === "success"
                                    ? "#2ecc77" // Clean success green
                                    : status === "error"
                                        ? "#e74c3c" // Error red
                                        : "var(--accent, #4a90e2)", // Neutral state color (assuming app defines this)

                            // Ensure text is white and border is removed
                            color: "white",
                            border: 'none',

                            // Smooth transition for all color properties
                            transition: "background-color 0.2s ease, transform 0.1s ease",
                        }}
                    >Add</button>
                </form>
            </section>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                {status === "success" && (
                    <div style={{ color: "#2ecc71" }}>success!</div>
                )}
                {status === "error" && (
                    <div style={{ color: "#e74c3c" }}>Error, please try again</div>
                )}
            </div>
        </main>
    );
}
