import React from "react";
import styled from "styled-components";

export default function Checkbox({ id, label, onChange }) {
    return (
        <StyledWrapper>
            <div className="checkbox-container">
                <input
                    type="checkbox"
                    id={id}
                    className="task-checkbox"
                    onChange={onChange}
                />

                <label htmlFor={id} className="checkbox-label">
                    <div className="checkbox-box">
                        <div className="checkbox-fill" />
                        <div className="checkmark">
                            <svg viewBox="0 0 24 24" className="check-icon">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                        </div>
                        <div className="success-ripple" />
                    </div>

                    {/* FIX: label text goes here */}
                    <span className="checkbox-text">{label}</span>
                </label>
            </div>
        </StyledWrapper>
    );
}

const StyledWrapper = styled.div`
  .checkbox-container {
    display: flex;
    align-items: center;
    user-select: none;
  }

  .task-checkbox {
    display: none;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    font-size: 16px;
    color: #000000ff;
    font-weight: 500;
    transition: all 0.2s ease;
    padding: 8px;
    border-radius: 8px;
    font-family: Verdana;
    text-transform: capitalize;
    }

  .checkbox-label:hover {
    /*background: black;*/
    color: #0b3b0cff;
  }

  .checkbox-box {
    position: relative;
    width: 22px;
    height: 22px;
    border: 2px solid #d1d5db;
    border-radius: 6px;
    margin-right: 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }

  .checkbox-fill {
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    transform: scale(0);
    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    border-radius: 4px;
    opacity: 0;
  }

  .checkmark {
    position: relative;
    z-index: 2;
    opacity: 0;
    transform: scale(0.3) rotate(20deg);
    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .check-icon {
    width: 14px;
    height: 14px;
    fill: white;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }

  .success-ripple {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(16, 185, 129, 0.4);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
    pointer-events: none;
  }

  .checkbox-text {
    transition: all 0.3s ease;
    position: relative;
  }

  .checkbox-text::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    height: 2px;
    width: 0;
    background: #151212ff;
    transform: translateY(-50%);
    transition: width 0.4s ease;
  }

  .task-checkbox:checked + .checkbox-label .checkbox-box {
    border-color: #10b981;
    background: #10b981;
    box-shadow:
      0 4px 12px rgba(16, 185, 129, 0.3),
      0 0 0 2px rgba(16, 185, 129, 0.2);
  }

  .task-checkbox:checked + .checkbox-label .checkbox-fill {
    transform: scale(1);
    opacity: 1;
  }

  .task-checkbox:checked + .checkbox-label .checkmark {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }

  .task-checkbox:checked + .checkbox-label .success-ripple {
    animation: rippleSuccess 0.6s ease-out;
  }

  .task-checkbox:checked + .checkbox-label .checkbox-text {
    color: #6b7280;
  }

  .task-checkbox:checked + .checkbox-label .checkbox-text::after {
    width: 100%;
  }

  @keyframes rippleSuccess {
    0% {
      width: 0;
      height: 0;
      opacity: 0.6;
    }
    70% {
      width: 50px;
      height: 50px;
      opacity: 0.3;
    }
    100% {
      width: 60px;
      height: 60px;
      opacity: 0;
    }
  }
`;
