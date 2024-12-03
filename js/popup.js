function openEditPopup() {
    document.getElementById('editPopup').style.display = 'block';
}

function closeEditPopup() {
    document.getElementById('editPopup').style.display = 'none';
}

document.getElementById('editForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const section = document.getElementById('editSection').value;
    const content = document.getElementById('editContent').value;
    document.getElementById(section + 'Content').textContent = content;
    closeEditPopup();
});