/**
 * Login component tests
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/renderWithProviders.jsx";
import Login from "../../pages/auth/Login.jsx";

// Mock CourseContext so CourseData() returns a working stub
vi.mock("../../context/CourseContext.jsx", () => ({
  CourseData: () => ({ fetchMyCourse: vi.fn(), courses: [], mycourse: [] }),
  CourseContextProvider: ({ children }) => children,
}));

// Helper: get inputs by type since labels lack matching id attrs
const getEmailInput    = () => screen.getByRole("textbox", { name: /email/i });
const getPasswordInput = () => document.querySelector('input[type="password"]');

describe("Login component", () => {
  it("renders email input, password input, and submit button", () => {
    renderWithProviders(<Login />);
    // Check by input type since ids are missing
    expect(document.querySelector('input[type="email"]')).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("renders link to register page", () => {
    renderWithProviders(<Login />);
    const registerLink = screen.getByRole("link", { name: /register/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/register");
  });

  it("renders forgot password link", () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole("link", { name: /forgot password/i })).toBeInTheDocument();
  });

  it("updates email and password fields on user input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput    = document.querySelector('input[type="email"]');
    const passwordInput = document.querySelector('input[type="password"]');

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "Password1");

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("Password1");
  });

  it("submit button is enabled by default", () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole("button", { name: /login/i })).not.toBeDisabled();
  });

  it("email input has type=email", () => {
    renderWithProviders(<Login />);
    expect(document.querySelector('input[type="email"]')).toBeInTheDocument();
  });

  it("password input is masked", () => {
    renderWithProviders(<Login />);
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
  });

  it("form has a login heading", () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole("heading", { name: /login/i })).toBeInTheDocument();
  });
});
