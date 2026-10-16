/* Shared identity/submission state retained for existing classic-script consumers.
   Authentication and user management are supplied by the live session modules.
   The retired local demo login, credentials and storage writers were removed. */
const DemoAccess = {users:[], submissions:[], currentUser:null};
var handleDemoLogin, logoutDemoUser, addDemoUser, renderDemoUsers;
