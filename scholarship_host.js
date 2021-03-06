// Initialize Cloud Firestore through Firebase
var db = firebase.firestore();

//process URL data
var thisURL =document.URL;
var uID;
var defaultSearch;

// Disable deprecated features
db.settings({
  timestampsInSnapshots: true
});

firebase.auth().onAuthStateChanged(function(user) {
    if (user) 
    {
        console.log("Logged in");
        uID = user.uid;
        document.getElementById("chat-iframe").setAttribute("src","./Xiaojian%20Chen/Chatting.html?uID="+uID);
        getDefaultSearch();
    }
    else
    {
        console.log("Not logged in");
        window.location='./index.html';
    }
});

function logout() {

    console.log("Logout")
    uID = -1;
    firebase.auth().signOut();
}

function applyButtons() {
    document.querySelector("#search-container form").addEventListener("submit", function(e) {
        e.preventDefault();
        document.getElementById("submit-search").click();   
    });

    document.getElementById("submit-search").addEventListener("click", function(e) {
        search(getSearchTerms());
    });

    document.getElementById("submit-search").addEventListener("keydown", function(e) {
        if (e.keyCode === 13) {
            e.target.click();
        }
    });

    document.getElementById("reset-search").addEventListener("click", function(e) {
        document.getElementById("no-results").style.display = "none";
        document.getElementById("searchbar").value = ""
        document.getElementById("advanced-search-iframe").src = document.getElementById("advanced-search-iframe").src;
        search({keywords:[]});
    });

    document.getElementById("reset-search").addEventListener("keydown", function(e) {
        if (e.keyCode === 13) {
            e.target.click();
        }
    });

    document.getElementById("advanced-search").addEventListener("click", function(e) {
        document.getElementById("advanced-search-modal").style.display = "flex";
    });

    document.getElementById("advanced-search-modal").addEventListener("click", function(e) {
        document.getElementById("advanced-search-modal").style.display = "none";
    });

    document.getElementById("scholarship-modal").addEventListener("click", function(e) {
        closeOverlay();
    });

    document.getElementById("chat-minimize").addEventListener("click", function(e) {
        if (document.getElementById("chat-minimize").getAttribute("state") == "open") {
            document.getElementById("chat-body").style.display = "none";
            document.getElementById("chat-minimize").style.border = "solid 2px white";
            document.getElementById("chat-header").style.background = "#4A86E8";
            document.getElementById("chat-minimize").setAttribute("title", "Maximize Chat");
            document.getElementById("chat-minimize").setAttribute("state", "closed");
        } else {
            document.getElementById("chat-body").style.display = "flex";
            document.getElementById("chat-minimize").style.border = "";
            document.getElementById("chat-header").style.background = "gray";
            document.getElementById("chat-minimize").setAttribute("title", "Minimize Chat");
            document.getElementById("chat-minimize").setAttribute("state", "open");
        }
    });

    document.getElementById("chat-close").addEventListener("click", function(e) {
        document.getElementById("chat-modal").close();
        document.getElementById("counselor-button").style.visibility = "visible";
    });
}

function getAllScholarships() {
    var today = new Date();
    clearResults();

    db.collection("scholarships").orderBy("name")
    .get().then(function(query) {
        query.forEach(function(doc) {
            var deadline;
            eval("deadline = new Date('" + doc.data().deadline + "T23:59:59')");

            if (deadline > today)
                addScholarship(doc);
        })
    })
    .then(function() {
        document.getElementById("loader").style.display = "none";
    });
}

function addScholarship(doc) {
    var date;
    eval("date = new Date('" + doc.data().deadline + "T00:00:00')");
    var deadlineDate = date.toLocaleString("en-us", {
        month: "long",
        year: "numeric",
        day: "numeric"
    });

    var row = document.createElement("tr");
    var scholarship = document.createElement("div"); 
    scholarship.setAttribute("class", "scholarship"); scholarship.setAttribute("sid", doc.data().sid); scholarship.setAttribute("tabIndex", "0");
    var imageContainer = document.createElement("div"); imageContainer.setAttribute("class", "scholarship-img");
    var image = document.createElement("img"); image.setAttribute("src", doc.data().image);
    var overview = document.createElement("div"); overview.setAttribute("class", "scholarship-overview");
    var majorInfo = document.createElement("div"); majorInfo.setAttribute("class", "scholarship-info");
    var name = document.createElement("h3"); name.innerHTML = doc.data().name;
    var award = document.createElement("p"); award.innerHTML = "$" + doc.data().award.toLocaleString("en"); award.setAttribute("class", "award");
    var deadline = document.createElement("p"); deadline.innerHTML = "Deadline: " + deadlineDate; deadline.setAttribute("class", "deadline");
    var oneLine = document.createElement("p"); oneLine.innerHTML = doc.data().one_line; oneLine.setAttribute("class", "one-line");
    var tags = document.createElement("p"); tags.innerHTML = "Tags: " + doc.data().tags.join(", "); tags.setAttribute("class", "tags");

    majorInfo.appendChild(award);
    majorInfo.appendChild(deadline);

    overview.appendChild(name);
    overview.appendChild(majorInfo);
    overview.appendChild(oneLine);
    overview.appendChild(tags);

    imageContainer.appendChild(image);

    scholarship.appendChild(imageContainer);
    scholarship.appendChild(overview);

    scholarship.addEventListener("click", function(e) {
        document.getElementById("scholarship-modal").style.display = "flex";
        document.getElementById("scholarship-iframe").setAttribute("src", "./scholarship_overlay.html?sid=" + e.target.closest(".scholarship").getAttribute("sid"));
    });

    scholarship.addEventListener("keyup", function(e) {
        // Cancel the default action, if needed
        e.preventDefault();
        // Number 13 is the "Enter" key on the keyboard
        if (e.keyCode === 13) {
            // Trigger the button element with a click
            e.target.click();
        }
    });

    row.appendChild(scholarship);

    document.getElementById("results-table").appendChild(row);
}

function onMessage(event) {
    // Check sender origin to be trusted
    //if (event.origin !== "http://example.com") return;

    var data = event.data;

    if (typeof data.func === "number") {
        switch(data.func) {
            case 0: closeOverlay(); break;
            case 1: closeOverlay(); document.getElementById("searchbar").value = JSON.stringify(data.params); search(data.params); break;
        }
    }
}

// Function to be called from iframe
function closeOverlay() {
    document.getElementById("advanced-search-modal").style.display = "none";
    document.getElementById("scholarship-modal").style.display = "none";
    document.getElementById("scholarship-iframe").setAttribute("src", "")
}

function getSearchTerms() {
    var searchbar = document.getElementById("searchbar");
    var search;

    if (searchbar.value[0] === "{" && searchbar.value[searchbar.value.length - 1] === "}" && validateSearch(searchbar.value)) {
        eval("search = " + searchbar.value);
        console.log(search);
        return search;
    } else {
        search = (searchbar.value.indexOf('"') != -1) ? searchbar.value.match(/"[^"]*"|\b[^"\s]*|/g) : searchbar.value.split(/[\s,]/);
        search = search.filter(Boolean);
        search.forEach(function(e, i) {if (/"[^"]*"/.test(e)) {search[i] = e.substring(1, e.length - 1);} });

        console.log(search);
        return {keywords: search};
    }
}

function validateSearch(searchbar) {
    var obj = {};
    
    try {
        eval("obj = " + searchbar);
    } catch (error) {
        return false;
    }

    return (obj.hasOwnProperty("keywords")) && Array.isArray(obj.keywords);
}

function search(search) {
    clearResults();
    console.log(search);

    // Required Params and Related Variables
    var today = new Date();
    var keywords = search.keywords;
    var results = [];

    if (keywords == null || keywords.length === 0) {
        search.empty_search = true;
    }

    // Parse Optional Params
    var minAward = (search.hasOwnProperty("min_award") && typeof search.min_award === "number") ? search.min_award : 0;
    var maxEssays = (search.hasOwnProperty("max_essays") && typeof search.max_essays === "number") ? search.max_essays : 999;
    var major = (search.hasOwnProperty("major") && typeof search.major === "string") ? search.major : "All";
    var provider = (search.hasOwnProperty("provider") && typeof search.provider === "string") ? search.provider : "Any";
    var ethnicity = (search.hasOwnProperty("ethnicity") && typeof search.ethnicity === "string") ? search.ethnicity : "Any";
    var gradYear = (search.hasOwnProperty("grad_year") && typeof search.grad_year === "number") ? search.grad_year : 0;
    var classLevel = (search.hasOwnProperty("class_level") && typeof search.class_level === "number") ? search.class_level : -1;
    var degree = (search.hasOwnProperty("degree") && typeof search.degree === "number") ? search.degree : 0;
    var maxGPA = (search.hasOwnProperty("max_gpa") && typeof search.max_gpa === "number") ? search.max_gpa : 10;
    var citizenship = (search.hasOwnProperty("citizenship") && typeof search.citizenship === "boolean") ? search.citizenship : 0; 

    document.getElementById("long-load").style.visibility = "hidden";
    document.getElementById("loader").style.display = "flex";

    setTimeout(function() {
        document.getElementById("long-load").style.visibility = "visible";
    }, 10000);

    db.collection("scholarships")
    .orderBy("award")
    .get().then(function(query) {
        query.forEach(function(doc) {
            // Deadline Filter
            var deadline;
            eval("deadline = new Date('" + doc.data().deadline + "T23:59:59')");
            if (deadline < today) return;

            // Optional Param Filter
            if (doc.data().award < minAward) return;
            if (parseInt(doc.data().requirements.essays) > maxEssays) return;
            if (major !== "All" && doc.data().requirements.major !== "All" && doc.data().requirements.major !== major) return;
            if (provider !== "Any" && doc.data().provider !== provider) return;
            if (doc.data().requirements.grad_year < gradYear) return;
            if (parseInt(doc.data().requirements.year) < classLevel) return;
            if (doc.data().requirements.degree > degree) return;
            if (doc.data().requirements.gpa > maxGPA) return;
            if (citizenship !== 0 && doc.data().requirements.citizenship !== citizenship) return;

            // Empty Search
            if (search.hasOwnProperty("empty_search") && typeof search.empty_search === "boolean") {
                results.push(doc); return;
            }

            // Keyword Search
            keywords.forEach(function(term) {
                if (doc.data().name.toLowerCase().includes(term.toLowerCase())) {
                    if (!results.includes(doc))
                        results.push(doc); return;
                }
                else if (doc.data().description.toLowerCase().includes(term.toLowerCase())) {
                    if (!results.includes(doc))
                        results.push(doc); return;
                }
                else if (doc.data().award.toString().toLowerCase().includes(term.toLowerCase())) {
                    if (!results.includes(doc))
                        results.push(doc); return;
                }
                else if (doc.data().tags.find(function(e) {return e.toLowerCase().includes(term.toLowerCase());}) !== undefined) {
                    if (!results.includes(doc))
                        results.push(doc); return;
                }
                else if (doc.data().provider.toLowerCase().includes(term.toLowerCase())) {
                    if (!results.includes(doc))
                        results.push(doc); return;
                }
                /*else if (doc.data().requirements.ethnicity.toLowerCase().includes(term.toLowerCase())) {
                    if (!results.includes(doc))
                        results.push(doc); return;
                }
                else if (doc.data().requirements.major.toLowerCase().includes(term.toLowerCase())) {
                    if (!results.includes(doc))
                        results.push(doc); return;
                }*/
            });
        });
    })
    .then(function() {
        showSearch(results);
    });
}

function showSearch(results) {
    if (results.length > 0) {
        results.forEach(function(doc) {
            addScholarship(doc);
        });
    } else {
        document.getElementById("no-results").style.display = "flex";
    }
    
    document.getElementById("loader").style.display = "none";     
}

function clearResults() {
    document.getElementById("no-results").style.display = "none";
    var oldResults = document.getElementsByClassName("scholarship");
    while(oldResults[0])
        oldResults[0].parentNode.removeChild(oldResults[0]);
}

function getDefaultSearch() {
    var search = {
        keywords:[],
        grad_year: 0,
        max_gpa: 0,
        citizenship: true,
        major: "",
        ethnicity: "Any",
        class_level: 0,
        degree: 0
    };

    db.collection("users").doc(uID).get().then(function(doc) {
        search.grad_year = parseInt(doc.data().Graduation_Year);
        search.max_gpa = parseFloat(doc.data().GPA);
        search.citizenship = doc.data().US_Citizenship === "true";
        search.major = doc.data().Major;
        search.ethnicity = doc.data().Ethnicity;
        search.class_level = parseInt(doc.data().Class_Level);
        search.degree= parseInt(doc.data().Degree);

        return search;
    })

    return search;
}


// Run on Start 
var serverTimeout = setTimeout(function() {
    document.getElementById("long-load").style.visibility = "visible";
}, 10000);

if (window.addEventListener) {
    window.addEventListener("message", onMessage, false);        
} 
else if (window.attachEvent) {
    window.attachEvent("onmessage", onMessage, false);
}

applyButtons();
search({keywords:[]});


//For open student chat window
function openChat() { 
    document.getElementById("chat-modal").show();
    document.getElementById("counselor-button").style.visibility = "hidden";
    document.getElementById("chat-minimize").setAttribute("state", "open");
}


//Profile page
function Profile(){
    location.href='./profile.html'+'?uID='+uID
}