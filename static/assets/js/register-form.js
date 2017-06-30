document.getElementById("avatar").onchange = function () {
    var reader = new FileReader();

    reader.onload = function (e) {
        // get loaded data and render thumbnail.
        document.getElementById("avatar-preview").style.backgroundImage = 'url(\''+e.target.result+'\')';
    };

    // read the image file as a data URL.
    reader.readAsDataURL(this.files[0]);
};
