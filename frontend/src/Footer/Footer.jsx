import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-columns">

        <div className="footer-col">
          <h3>Stay Updated</h3>
          <p>Get app updates, new features, and smart cooking tips.</p>
          <button className="footer-btn">Sign Up</button>
        </div>

        <div className="footer-col">
          <h3>About Us</h3>
          <ul>
            <li>Our Story</li>
            <li>How reciPal Works</li>
            <li>Careers</li>
            <li>Contact</li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Help</h3>
          <ul>
            <li>FAQ</li>
            <li>Privacy Policy</li>
            <li>Terms of Service</li>
            <li>Support</li>
            <li>Report a Bug</li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Social</h3>
          <ul>
            <li>Instagram</li>
            <li>TikTok</li>
            <li>GitHub</li>
          </ul>
        </div>

      </div>

      <div className="footer-disclaimer">
        <p>
          *reciPal is for personal cooking and grocery planning only. Any nutritional
          insights provided by the app are informational and should not be taken as
          professional dietary or medical advice.
        </p>
      </div>

      <p className="footer-copy">© 2025 reciPal. All rights reserved.</p>
    </footer>
  );
}
