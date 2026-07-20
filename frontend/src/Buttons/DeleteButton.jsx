import React from "react";
import styled from "styled-components";

export default function DeleteButton({ onClick }) {
    return (
        <Wrapper>
            <button className="delete-btn" onClick={onClick}>
                {/* Top lid */}
                <svg className="svgIcon bin-top" viewBox="0 0 69 14">
                    <path
                        d="M20.8232 2.62734L19.9948 4.21304C19.8224 4.54309 19.4808 4.75 19.1085 4.75H4.92857C2.20246 4.75 0 6.87266 0 9.5C0 12.1273 2.20246 14.25 4.92857 14.25H64.0714C66.7975 14.25 69 12.1273 69 9.5C69 6.87266 66.7975 4.75 64.0714 4.75H49.8915C49.5192 4.75 49.1776 4.54309 49.0052 4.21305L48.1768 2.62734C47.3451 1.00938 45.6355 0 43.7719 0H25.2281C23.3645 0 21.6549 1.00938 20.8232 2.62734Z"
                        fill="black"
                    />
                </svg>

                {/* Bottom bin body */}
                <svg className="svgIcon bin-bottom" viewBox="0 0 69 57">
                    <path
                        d="M20.8232 -16.3727L19.9948 -14.787C19.8224 -14.4569 19.4808 -14.25 19.1085 -14.25H4.92857C2.20246 -14.25 0 -12.1273 0 -9.5C0 -6.8727 2.20246 -4.75 4.92857 -4.75H64.0714C66.7975 -4.75 69 -6.8727 69 -9.5C69 -12.1273 66.7975 -14.25 64.0714 -14.25H49.8915C49.5192 -14.25 49.1776 -14.4569 49.0052 -14.787L48.1768 -16.3727C47.3451 -17.9906 45.6355 -19 43.7719 -19H25.2281C23.3645 -19 21.6549 -17.9906 20.8232 -16.3727ZM64.0023 1.0648C64.0397 0.4882 63.5822 0 63.0044 0H5.99556C5.4178 0 4.96025 0.4882 4.99766 1.0648L8.19375 50.3203C8.44018 54.0758 11.6746 57 15.5712 57H53.4288C57.3254 57 60.5598 54.0758 60.8062 50.3203L64.0023 1.0648Z"
                        fill="black"
                    />
                </svg>
            </button>
        </Wrapper>
    );
}

const Wrapper = styled.div`
  display: inline-flex;

  .delete-btn {
    width: 50px;
    height: 50px;
    background: #bf8c35ff;
    border-radius: 50%;
    border: none;
    cursor: pointer;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 2px;
    transition: 0.3s ease;
    overflow: hidden;

    box-shadow: 0px 3px 16px rgba(0, 0, 0, 0.2);
  }

  .svgIcon {
    width: 22px;
    transition: 0.3s ease;
  }

  .delete-btn:hover {
    background-color: #bf8c35ff;
  }

  .bin-top {
    transform-origin: bottom right;
  }

  .delete-btn:hover .bin-top {
    transform: rotate(155deg);
  }
`;
