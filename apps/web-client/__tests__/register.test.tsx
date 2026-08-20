import { render, screen, fireEvent } from "@testing-library/react";
import RegisterPage from "../app/register/page";

describe("RegisterPage", () => {
  it("renders the register form", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { name: /create an account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
  });

  it("handles form submission loading state", () => {
    render(<RegisterPage />);
    const submitButton = screen.getByRole("button", { name: /register/i });
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    expect(screen.getByRole("button", { name: /loading/i })).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});
