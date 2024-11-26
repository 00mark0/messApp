import PropTypes from "prop-types";

const ToggleSwitch = ({ isOn, handleToggle }) => {
  return (
    <div
      className={`w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer ${
        isOn ? "bg-green-500" : "bg-gray-300"
      }`}
      onClick={handleToggle}
    >
      <div
        className={`bg-white w-6 h-6 rounded-full shadow-md transform ${
          isOn ? "translate-x-6" : ""
        }`}
      ></div>
    </div>
  );
};

// props validation
ToggleSwitch.propTypes = {
  isOn: PropTypes.bool.isRequired,
  handleToggle: PropTypes.func.isRequired,
};

export default ToggleSwitch;
