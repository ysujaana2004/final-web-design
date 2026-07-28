import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import bread from "../assets/bread.png";
import Footer from "../Footer/Footer.jsx";
import { supabase } from "../lib/supabase";

const Form = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [login, setLogin] = useState({ email: "", password: "" });
    const [signup, setSignup] = useState({
        email: "",
        username: "",
        password: "",
        confirmPassword: ""
    });
    const [status, setStatus] = useState({ type: "", message: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const destination = location.state?.from || "/recipes";

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: "", message: "" });
        setIsSubmitting(true);

        const { error } = await supabase.auth.signInWithPassword(login);

        setIsSubmitting(false);

        if (error) {
            setStatus({ type: "error", message: error.message });
            return;
        }

        navigate(destination, { replace: true });
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: "", message: "" });

        if (signup.password.length < 8) {
            setStatus({ type: "error", message: "Use a password with at least 8 characters." });
            return;
        }

        if (signup.password !== signup.confirmPassword) {
            setStatus({ type: "error", message: "Passwords do not match." });
            return;
        }

        setIsSubmitting(true);

        const options = {
            data: {
                username: signup.username.trim() || null
            }
        };

        const redirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;

        if (redirectUrl) {
            options.emailRedirectTo = redirectUrl;
        }

        const { data, error } = await supabase.auth.signUp({
            email: signup.email,
            password: signup.password,
            options
        });

        setIsSubmitting(false);

        if (error) {
            setStatus({ type: "error", message: error.message });
            return;
        }

        if (data.session) {
            navigate(destination, { replace: true });
            return;
        }

        setStatus({
            type: "success",
            message: "Your account was created. Confirm your email, then sign in."
        });
    };

    return (
        <>
            <StyledWrapper>
                <div className="container">
                    <input type="checkbox" id="signup_toggle" />
                    <div className="form">
                        <form className="form_front" onSubmit={handleLoginSubmit}>
                            <img src={bread} alt="Bread Icon" className="login-image" />
                            <div className="form_details">Login</div>
                            <input
                                placeholder="Email"
                                className="input"
                                type="email"
                                autoComplete="email"
                                aria-label="Email"
                                value={login.email}
                                onChange={(e) => setLogin({ ...login, email: e.target.value })}
                                required
                            />
                            <input
                                placeholder="Password"
                                className="input"
                                type="password"
                                autoComplete="current-password"
                                aria-label="Password"
                                value={login.password}
                                onChange={(e) => setLogin({ ...login, password: e.target.value })}
                                required
                            />
                            <button className="btn" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Signing in..." : "Login"}
                            </button>
                            <span className="switch">
                                Don't have an account?{" "}
                                <label className="signup_tog" htmlFor="signup_toggle">
                                    Sign Up
                                </label>
                            </span>
                        </form>

                        <form className="form_back" onSubmit={handleSignupSubmit}>
                            <img src={bread} alt="Bread Icon" className="login-image" />
                            <div className="form_details">Sign Up</div>
                            <input
                                placeholder="Email"
                                className="input"
                                type="email"
                                autoComplete="email"
                                aria-label="Signup email"
                                value={signup.email}
                                onChange={(e) => setSignup({ ...signup, email: e.target.value })}
                                required
                            />
                            <input
                                placeholder="Username"
                                className="input"
                                type="text"
                                autoComplete="username"
                                aria-label="Username"
                                value={signup.username}
                                onChange={(e) => setSignup({ ...signup, username: e.target.value })}
                            />
                            <input
                                placeholder="Password"
                                className="input"
                                type="password"
                                autoComplete="new-password"
                                aria-label="Signup password"
                                value={signup.password}
                                onChange={(e) => setSignup({ ...signup, password: e.target.value })}
                                required
                            />
                            <input
                                placeholder="Confirm Password"
                                className="input"
                                type="password"
                                autoComplete="new-password"
                                aria-label="Confirm password"
                                value={signup.confirmPassword}
                                onChange={(e) => setSignup({ ...signup, confirmPassword: e.target.value })}
                                required
                            />
                            <button className="btn" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Creating account..." : "Sign Up"}
                            </button>
                            <span className="switch">
                                Already have an account?{" "}
                                <label className="signup_tog" htmlFor="signup_toggle">
                                    Sign In
                                </label>
                            </span>
                        </form>
                    </div>
                    {status.message && (
                        <p className={`auth-status auth-status--${status.type}`} role="status">
                            {status.message}
                        </p>
                    )}
                </div>
            </StyledWrapper>
            <Footer />
        </>
    );
};

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #D0D9C7;
  perspective: 1200px; 

  .container {
    position: relative;
    width: 350px;
    height: 450px;
  }

  .form {
    position: relative;
    width: 120%;
    height: 120%;
    transform-style: preserve-3d;
    transition: transform 1s ease;
  }

  .login-image {
    width: 80px;
    height: 80px;
    object-fit: contain;
    margin-bottom: 12px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  #signup_toggle {
    display: none;
  }

  #signup_toggle:checked + .form {
    transform: rotateY(180deg);
  }

  .form_front {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;
    background-color: #212121;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6),
      inset 2px 2px 10px rgba(0, 0, 0, 1),
      inset -1px -1px 5px rgba(255, 255, 255, 0.2);
    backface-visibility: hidden;
  }

  .form_back {
    position: absolute;
    width: 110%;
    height: 110%;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 15px;
    background-color: #212121;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6),
      inset 2px 2px 10px rgba(0, 0, 0, 1),
      inset -1px -1px 5px rgba(255, 255, 255, 0.2);
    backface-visibility: hidden;
    padding-top: 20px;
    transform: rotateY(180deg);
  }

  .form_details {
    font-size: 30px;
    font-weight: 700;
    color: white;
  }

  .input {
    width: 85%;
    height: 50px;
    color: #fff;
    outline: none;
    transition: 0.35s;
    padding: 0 15px;
    background-color: #2c2c2c;
    border-radius: 6px;
    border: 2px solid #212121;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8),
      inset 1px 1px 6px rgba(255, 255, 255, 0.2);
  }

  .input::placeholder {
    color: #999;
  }

  .input:focus {
    transform: scale(1.05);
    box-shadow: 0 0 10px #c9a48b;
  }

  .btn {
    padding: 10px 35px;
    cursor: pointer;
    background-color: #fec195;
    border-radius: 6px;
    border: none;
    color: #212121;
    font-size: 15px;
    font-weight: bold;
    transition: all 0.3s ease;
  }

  .btn:hover {
    background-color: #a8c3b9;
    color: black;
    transform: scale(1.05);
  }

  .switch {
    font-size: 13px;
    color: white;
    margin-top: 10px;
    margin-bottom: 25px;
  }

  .signup_tog {
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
    color: #c9a48b;
  }

  .auth-status {
    color: white;
    margin-top: 18px;
    text-align: center;
  }

  .auth-status--error {
    color: #ffb4ab;
  }

  .auth-status--success {
    color: #b7e4c7;
  }
`;

export default Form;
