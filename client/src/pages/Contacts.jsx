import YourContacts from "../components/Contacts/YourContacts";
import AddContacts from "../components/Contacts/AddContacts";
import PendingReqs from "../components/Contacts/PendingReqs";

function Contacts() {
  return (
    <div className="dark:bg-gray-800 min-h-screen w-full">
      {/* Top grid for YourContacts and AddContacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 dark:bg-gray-800">
        <div className="order-last md:order-first max-h-96">
          <YourContacts />
        </div>
        <div className="order-first md:order-last max-h-96">
          <AddContacts />
        </div>
      </div>
      {/* PendingReqs centered with auto margins */}
      <div className="mt-8 mx-auto w-full max-h-96">
        <PendingReqs />
      </div>
    </div>
  );
}

export default Contacts;
