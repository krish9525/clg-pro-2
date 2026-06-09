/**
 * RTL render wrapper that provides React Router + UserContext.
 *
 * NOTE: CourseContext is mocked at the module level in each test file
 * (or in vitest.config.js) because its context object is not exported.
 */
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserContextProvider } from "../../context/UserContext.jsx";

export function renderWithProviders(ui, { initialEntries = ["/"] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <UserContextProvider>
        {ui}
      </UserContextProvider>
    </MemoryRouter>
  );
}
