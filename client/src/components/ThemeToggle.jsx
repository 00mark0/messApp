import { useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import ThemeContext from "../context/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button onClick={toggleTheme} className="p-2">
      <FontAwesomeIcon
        icon={theme === "dark" ? faSun : faMoon}
        className="text-yellow-400"
        size="2xl"
      />
    </button>
  );
}

export default ThemeToggle;
