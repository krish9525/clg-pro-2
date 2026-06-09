import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/renderWithProviders.jsx";
import Register from "../../pages/auth/Register.jsx";

vi.mock("../../context/CourseContext.jsx", () => ({
  CourseData: () => ({ fetchMyCourse: vi.fn(), courses: [], mycourse: [] }),
  CourseContextProvider: ({ children }) => children,
}));

describe("Register component", () => {
  it("renders name, email, password inputs", () => {
    renderWithProviders(<Register />);
    expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
    expect(document.querySelector('input[type="email"]')).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
  });

  it("renders the Register heading", () => {
    renderWithProviders(<Register />);
    expect(screen.getByRole("heading", { name: /register/i })).toBeInTheDocument();
  });

  it("renders link to login page", () => {
    renderWithProviders(<Register />);
    const loginLink = screen.getByRole("link", { name: /login/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("submit button reads Register", () => {
    renderWithProviders(<Register />);
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
  });

  it("accepts user input in all three fields", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    const nameInput     = document.querySelector('input[type="text"]');
    const emailInput    = document.querySelector('input[type="email"]');
    const passwordInput = document.querySelector('input[type="password"]');

    await user.type(nameInput,     "Alice");
    await user.type(emailInput,    "alice@test.com");
    await user.type(passwordInput, "Secret123");

    expect(nameInput).toHaveValue("Alice");
    expect(emailInput).toHaveValue("alice@test.com");
    expect(passwordInput).toHaveValue("Secret123");
  });

  it("password input is masked", () => {
    renderWithProviders(<Register />);
    expect(document.querySelector('input[type="password"]')).toHaveAttribute("type", "password");
  });

  it("email input has correct type", () => {
    renderWithProviders(<Register />);
    expect(document.querySelector('input[type="email"]')).toHaveAttribute("type", "email");
  });
});
