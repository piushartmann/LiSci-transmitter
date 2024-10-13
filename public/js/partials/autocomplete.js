function autocomplete(input, arr) {
    var currentFocus;
    input.addEventListener("input", function (e) {
        var autocompleteContainer, autocompleteItem, index, inputValue = this.value;
        closeAllLists();
        if (!inputValue) { return false; }
        currentFocus = -1;
        autocompleteContainer = document.createElement("DIV");
        autocompleteContainer.setAttribute("id", this.id + "autocomplete-list");
        autocompleteContainer.setAttribute("class", "autocomplete-items");
        this.parentNode.insertBefore(autocompleteContainer, this.nextSibling);
        for (index = 0; index < arr.length; index++) {
            if (arr[index].substr(0, inputValue.length).toUpperCase() == inputValue.toUpperCase()) {
                autocompleteItem = document.createElement("DIV");
                autocompleteItem.innerHTML = "<strong>" + arr[index].substr(0, inputValue.length) + "</strong>";
                autocompleteItem.innerHTML += arr[index].substr(inputValue.length);
                autocompleteItem.innerHTML += "<input type='hidden' value='" + arr[index] + "'>";
                autocompleteItem.addEventListener("click", function (e) {
                    input.value = this.getElementsByTagName("input")[0].value;
                    selectUser(input.value);
                    closeAllLists();
                });
                autocompleteContainer.appendChild(autocompleteItem);
            }
        }
    });
    input.addEventListener("keydown", function (event) {
        var item = document.getElementById(this.id + "autocomplete-list");
        if (item) item = item.getElementsByTagName("div");
        if (event.keyCode == 40) {
            currentFocus++;
            addActive(item);
        } else if (event.keyCode == 38) {
            currentFocus--;
            addActive(item);
        } else if (event.keyCode == 13) {
            event.preventDefault();
            if (currentFocus > -1) {
                if (item) item[currentFocus].click();
            }
        }
    });
    function addActive(item) {
        if (!item) return false;
        removeActive(item);
        if (currentFocus >= item.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (item.length - 1);
        item[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(item) {
        for (var i = 0; i < item.length; i++) {
            item[i].classList.remove("autocomplete-active");
        }
    }
    function closeAllLists(element) {
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            if (element != x[i] && element != input) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}