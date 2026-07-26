import { useEffect, useRef, useState } from "react";
import "./Pantry.css";
import Footer from "../Footer/Footer";
import DeleteButton from "../Buttons/DeleteButton";
import {
  createPantryItem,
  deletePantryItem,
  getPantryItems,
} from "../lib/api";


export default function Pantry() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const detectorRef = useRef(null);
  const [manualCode, setManualCode] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIngredient, setNewIngredient] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // Fetch pantry items on component mount
  useEffect(() => {
    fetchPantryItems();
  }, []);

  const fetchPantryItems = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getPantryItems();
      setItems(result.data || []);
    } catch (err) {
      console.error("Failed to fetch pantry items:", err);
      setError(err.message || "Failed to load pantry items");
    } finally {
      setLoading(false);
    }
  };

  // Start camera scanning
  const startScan = async () => {
    setError("");
    const supported =
      "BarcodeDetector" in window &&
      typeof window.BarcodeDetector === "function";

    if (!supported) {
      setError(
        "Barcode scanning not supported in this browser. Use Chrome/Edge, or add manually below."
      );
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanning(true);
      scanLoop();
    } catch (e) {
      console.error(e);
      setError("Could not access the camera. Check permissions and try again.");
    }
  };

  // Stop scanning
  const stopScan = () => {
    cancelAnimationFrame(rafRef.current);
    setScanning(false);
    if (videoRef.current) videoRef.current.pause();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Cleanup
  useEffect(() => {
    return () => stopScan();
  }, []);

  // Detection loop
  const scanLoop = async () => {
    if (!videoRef.current || !detectorRef.current) return;

    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes && barcodes.length) {
        const code = barcodes[0].rawValue || "";
        handleDetectedBarcode(code);
        stopScan();
        return;
      }
    } catch (e) {
      // Ignore temporary decode errors
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  };

  // Handle detected barcode
  const handleDetectedBarcode = async (barcode) => {
    const product = await mockLookup(barcode);

    try {
      // Save to backend
      await createPantryItem({
        ingredient: product.title,
        quantity: 1,
        unit: "pieces",
      });

      // Refresh from backend so the new item includes joined ingredient data
      await fetchPantryItems();
    } catch (err) {
      console.error("Failed to add item:", err);
      if (err.message.includes("pantry_items_user_ingredient_unique")) {
        setError("That ingredient is already in your pantry.");
      } else {
        setError(err.message || "Failed to add item to pantry");
      }
    }
  };

  // Mock product lookup
  async function mockLookup(barcode) {
    const known = {
      "012345678905": { title: "Spaghetti Pasta", brand: "Barilla" },
      "04963406": { title: "Tomato Sauce", brand: "Hunt's" },
      "036000291452": { title: "All-Purpose Flour", brand: "King Arthur" },
    };
    return known[barcode] || {
      title: `Item ${barcode.slice(-4)}`,
      brand: "Unknown Brand",
    };
  }

  const removeItem = async (id) => {
    try {
      await deletePantryItem(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      console.error("Failed to delete item:", err);
      setError(err.message || "Failed to delete item");
    }
  };

  const filtered = items.filter((it) =>
    (it.ingredients?.name || "")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const addManual = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleDetectedBarcode(manualCode.trim());
    setManualCode("");
  };

  // Add an item directly by name, skipping the barcode/mockLookup step
  // entirely so it doesn't get stuck with a placeholder "Item ####" name.
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newIngredient.trim()) return;

    try {
      setSavingItem(true);
      setError("");

      await createPantryItem({
        ingredient: newIngredient.trim(),
        quantity: newQuantity || null,
        unit: newUnit || null,
      });

      setNewIngredient("");
      setNewQuantity("");
      setNewUnit("");
      setShowAddForm(false);
      await fetchPantryItems();
    } catch (err) {
      console.error("Failed to add item:", err);
      if (err.message.includes("pantry_items_user_ingredient_unique")) {
        setError("That ingredient is already in your pantry.");
      } else {
        setError(err.message || "Failed to add item to pantry");
      }
    } finally {
      setSavingItem(false);
    }
  };

  return (
    <main className="page pantry-page">
      <div className="container">
        {/* Header */}
        <div className="pantry-header">
          <h1 className="page__title">Your Pantry</h1>
          <p className="page__subtitle">
            Scan a barcode to add items. Search to quickly find what you have.
          </p>

          {/* Search bar */}
          <section className="search-section">
            <div className="searchbar">
              <span className="searchbar__icon" aria-hidden="true">
                🔎
              </span>
              <input
                className="searchbar__input"
                placeholder="Search pantry…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </section>

          {/* Scan / Stop Button */}
          <div className="scan-controls">
            {!scanning ? (
              <button className="btn btn--solid" onClick={startScan}>
                Scan Barcode
              </button>
            ) : (
              <button className="btn btn--solid" onClick={stopScan}>
                Stop
              </button>
            )}
            <button
              className="btn btn--solid"
              onClick={() => setShowAddForm((prev) => !prev)}
            >
              {showAddForm ? "Cancel" : "Add Item"}
            </button>
          </div>
        </div>

        {/* Scanner preview */}
        {scanning && (
          <section className="scanner-section">
            <div className="card scanner-card">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>
          </section>
        )}

        {/* Add item by name, bypassing barcode lookup entirely */}
        {showAddForm && (
          <section className="manual-add">
            <form onSubmit={handleAddItem} className="card manual-form">
              <input
                className="searchbar__input"
                placeholder="Ingredient name"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
              />
              <input
                className="searchbar__input"
                placeholder="Quantity"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
              />
              <input
                className="searchbar__input"
                placeholder="Unit"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              />
              <button className="btn btn--solid sm" type="submit" disabled={savingItem}>
                {savingItem ? "Adding..." : "Add"}
              </button>
            </form>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="error-section">
            <p className="error-message">{error}</p>
          </div>
        )}

        {/* Manual Add */}
        {error && (
          <section className="manual-add">
            <form onSubmit={addManual} className="card manual-form">
              <input
                className="searchbar__input"
                placeholder="Enter barcode manually"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <button className="btn btn--solid sm" type="submit">
                Add
              </button>
            </form>
          </section>
        )}

        {/* Pantry Items */}
        <section className="pantry-grid">
          {loading ? (
            <div className="card empty-state">
              <p>Loading pantry items...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card empty-state">
              {items.length === 0 ? (
                <p>
                  Your pantry is empty. Click <b>Scan Barcode</b> to add your first item.
                </p>
              ) : (
                <p className="empty-message">No items match "{query}".</p>
              )}
            </div>
          ) : (
            filtered.map((it) => (
              <article key={it.id} className="card pantry-item">
                <div className="pantry-item__content">
                  <div className="pantry-item__info">
                    <h3>{it.ingredients?.name}</h3>
                    <p>
                      Quantity: {it.quantity} {it.unit}
                    </p>
                  </div>
                  {/*<button
                    className="btn btn--ghost sm"
                    onClick={() => removeItem(it.id)}
                  >
                  REMOVE
                  </button>*/}
                  <DeleteButton onClick={() => removeItem(it.id)} />

                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}