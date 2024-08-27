const body = document.querySelector("body");

const heading = document.querySelector("h1");
let text_0 = "HOUHOU";
let text_1 = heading.textContent;
let text_tmp = text_0;

body.addEventListener("click", (event) => {
    text_tmp = text_0;
    text_0 = text_1;
    text_1 = text_tmp;
    heading.textContent = text_0;
});
