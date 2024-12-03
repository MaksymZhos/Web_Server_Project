let auth2;

function initClient() {
    gapi.load('auth2', function() {
        auth2 = gapi.auth2.init({
            client_id: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
            scope: 'profile email'
        });

        auth2.isSignedIn.listen(updateSigninStatus);
    });
}

function handleAuthClick() {
    if (auth2.isSignedIn.get()) {
        auth2.signOut();
    } else {
        auth2.signIn();
    }
}

function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        document.getElementById('editButton').style.display = 'block';
    } else {
        document.getElementById('editButton').style.display = 'none';
        closeEditPopup();
    }
}

window.onload = initClient;