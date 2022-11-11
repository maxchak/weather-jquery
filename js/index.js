const API_KEY = "6c9369fd86fa4678a8a122125220811";
const BASE_URL = "http://api.weatherapi.com/v1";

//
const SLIDER_SLIDE_WIDTH = 600; // Custom slider offset width
const SLIDER_WIDTH = 50 * 96 - SLIDER_SLIDE_WIDTH; // Custom slider scroll width
let currentSliderOffset = 0; // Custom slider offset counter

const input = $("#input"); // Search input
const resultList = $("#results"); // List of found cities
const daySlider = $("#daySlider"); // Slick slider with 10 days forecast
const shortDaysBtn = $("#shortDaysBtn"); // Show short 10-days forecast information btn
const detailedDaysBtn = $("#detailedDaysBtn"); // Show detailed 10-days forecast information btn

// Slick slider config
const slickConfig = {
  arrows: false,
  dots: true,
  autoplay: false,
  slidesToShow: 8,
  slidesToScroll: 2,
  infinite: false,
};

// Init slider
daySlider.slick(slickConfig);

// Fetch default forecast
fetchForecast(58, 56.25);

// Debounce function for input
function debounce(func, timeout = 300) {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

// Document click handler to hide list of results on outer click
$(document).click((e) => {
  if (!(e.target.id === "input")) {
    resultList.hide();
  }
});

// Custom slider left arrow click
$("#hourSliderLeft").click(() => {
  currentSliderOffset -= SLIDER_SLIDE_WIDTH;
  $("#hourSliderRight").attr("disabled", false);

  if (currentSliderOffset <= 0) {
    $("#hourSliderLeft").attr("disabled", true);
    currentSliderOffset = 0;
  }

  $("#hourSlider").transition({ x: `${-currentSliderOffset}px` });
});

// Custom slider right arrow click
$("#hourSliderRight").click(() => {
  currentSliderOffset += SLIDER_SLIDE_WIDTH;
  $("#hourSliderLeft").attr("disabled", false);

  if (currentSliderOffset >= SLIDER_WIDTH) {
    $("#hourSliderRight").attr("disabled", true);
    currentSliderOffset = SLIDER_WIDTH;
  }

  $("#hourSlider").transition({ x: `${-currentSliderOffset}px` });
});

// Show search results when input get focus
input.on("focus", () => {
  resultList.show();
});

// Input oninput handler
input.on("input", (e) => {
  if (e.target.value.length < 2) {
    resultList.empty();
    return;
  }

  // Debounced fetch city
  debouncedInputHandler(e.target.value);
});

const debouncedInputHandler = debounce((q) => {
  fetchCity(q);
}, 1000);

// Show 10 days forecast slider
shortDaysBtn.click(() => {
  if (shortDaysBtn.hasClass("active")) return;

  shortDaysBtn.addClass("active");
  detailedDaysBtn.removeClass("active");

  daySlider.slick("unslick");
  daySlider.slick(slickConfig);

  $("#detailedWeather").hide();
  daySlider.show();
});

// Show detailed 10 days forecast
detailedDaysBtn.click(() => {
  if (detailedDaysBtn.hasClass("active")) return;

  detailedDaysBtn.addClass("active");
  shortDaysBtn.removeClass("active");

  daySlider.hide();
  $("#detailedWeather").show();
});

// Get hour:minute string from time
function getDate(localtime) {
  const time = new Date(localtime).toLocaleTimeString();

  return `${time.slice(0, -3)}`;
}

// Get Russian language wind direction
function getWindDir(dir) {
  const dirObj = {
    N: "С",
    S: "Ю",
    W: "З",
    E: "В",
    SW: "ЮЗ",
    SE: "ЮВ",
    NW: "СЗ",
    NE: "СВ",
    SSW: "ЮЮЗ",
    WSW: "ЗЮЗ",
    SSE: "ЮЮВ",
    ESE: "ВЮВ",
    NNW: "ССЗ",
    WNW: "ЗСЗ",
    NNE: "ССВ",
    ENE: "ВСВ",
  };

  return dirObj[dir];
}

// Get prettied temperature
function prettyTemperature(degree) {
  degree = Math.round(degree);

  return degree > 0 ? `+${degree}°` : `${degree}°`;
}

// Ajax request to search city
function fetchCity(city) {
  $.ajax({
    url: `${BASE_URL}/search.json?key=${API_KEY}&q=${city}`,
    success: (resArray) => {
      resultList.empty();

      if (!resArray.length) {
        resultList.append(
          $("<li class='header__search-item disabled'>Ничего не найдено</li>")
        );

        return;
      }

      resArray.forEach((res) => {
        const li = $("<li class='header__search-item'></li>").text(
          `${res.name}, ${res.region}`
        );

        li.click(() => {
          input.val("");
          resultList.hide().empty();

          currentSliderOffset = 0;
          $("#hourSlider").transition({ x: `0px` });
          $("#hourSliderLeft").attr("disabled", true);

          fetchForecast(res.lat, res.lon);
        });

        resultList.append(li);
      });
    },
  });
}

// Ajax request to fetch 10 days forecast
function fetchForecast(lat, lon) {
  $.ajax({
    url: `${BASE_URL}/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=10&lang=ru`,
    success: (res) => {
      const { location, current, forecast } = res;

      $("#city").text(
        `${location.name}, ${location.region}, ${location.country}`
      );
      $("#time").text(`Сейчас ${getDate(location.localtime)}.`);
      $("#currentDegrees").text(`${prettyTemperature(current.temp_c)}C`);
      $("#weatherImg")
        .attr("src", current.condition.icon)
        .attr("title", current.condition.text);
      $("#currentWeather").text(current.condition.text);
      $("#feelsLike").text(
        `Ощущается как ${prettyTemperature(current.feelslike_c)}C`
      );
      $("#wind").text(`${current.wind_mph}, ${getWindDir(current.wind_dir)}`);
      $("#humidity").text(`${current.humidity}%`);
      $("#pressure").text(`${current.pressure_mb} мм рт. ст`);
      $("#visibility").text(`${current.vis_km} км`);

      daySlider.slick("unslick");

      fillHourSlider(forecast.forecastday);
      fillDaySlider(forecast.forecastday);
      makeDetailedForecast(forecast.forecastday);

      daySlider.slick(slickConfig);
    },
  });
}

// Remove all children from detailed forecast to show forecast for new city
function makeDetailedForecast(daysForecast) {
  const detailedWeather = $("#detailedWeather");
  detailedWeather.empty();

  daysForecast.forEach((dayForecast, i) => {
    detailedWeather.append(createDetailedArticle(dayForecast, i));
  });
}

// Create article with a detailed 1-day forecast
function createDetailedArticle(dayForecast, index) {
  const options = { month: "long", day: "numeric", weekday: "long" };
  const date = new Date(dayForecast.date);

  const dateString = date.toLocaleDateString(undefined, options);

  const [weekDay, day, month] = dateString.replace(",", "").split(" ");

  return $("<article class='weather__card'></article>").append(
    $("<div class='weather__card-day'></div>").append(
      $("<h2 class='weather__card-title'></h2>")
        .addClass([0, 6].includes(date.getDay()) ? "weekend" : "")
        .append(
          $(`<span class='weather__card-date'>${day}</span>`),
          $(`<div class='weather__card-wrapper'>
          <span class='weather__card-weekday'>${month}</span>
          <span class='weather__card-month'>${
            (index === 0 && "сегодня") || (index === 1 && "завтра") || weekDay
          }</span>
        </div>`)
        )
    ),
    $("<table class='weather__table'></table>").append(
      $(`<thead>
            <tr>
              <th colspan='3'></th>
              <th>Давление,<br>мм рт. ст.</th>
              <th>Влажность</th>
              <th>Ветер,<br>м/с</th>
              <th>Дальность<br>видимости, км</th>
              <th>Ощущается как</th>
            </tr>
          </thead>`),
      $(`<tbody></tbody>`).append(...getTableRows(dayForecast))
    )
  );
}

// Fill hour slider with slides
function fillHourSlider(daysForecast) {
  $("#hourSlider").empty();

  const data = daysForecast
    .slice(0, 4)
    .map((day) => day.hour)
    .flat();

  data.forEach((hour) => {
    $("#hourSlider").append(
      createHourSlide(
        hour.time,
        hour.condition.icon,
        hour.temp_c,
        hour.condition.text
      )
    );
  });
}

// Fill day slider with slides
function fillDaySlider(daysForecast) {
  daySlider.empty();

  daysForecast.forEach((day, i) => {
    $("#daySlider").append(
      createDaySlide(
        day.date,
        i,
        day.day.condition,
        day.day.maxtemp_c,
        day.day.mintemp_c
      )
    );
  });
}

// Get array of table rows with 1-day forecast
function getTableRows(dayForecast) {
  const dayTime = ["Ночью", "Утром", "Днём", "Вечером"];
  const { hour } = dayForecast;

  // Count average weather statistics from array
  function countAverageWeather(quarter) {
    let totalTemp = 0,
      totalFeelsTemp = 0,
      totalHumidity = 0,
      totalVisibilityRange = 0,
      totalWindSpeed = 0,
      totalPressure = 0;

    quarter.forEach((hour) => {
      totalTemp += hour.temp_c;
      totalFeelsTemp += hour.feelslike_c;
      totalHumidity += hour.humidity;
      totalVisibilityRange += hour.vis_km;
      totalWindSpeed += hour.wind_mph;
      totalPressure += hour.pressure_mb;
    });

    return {
      imgSrc: quarter[2].condition.icon,
      weatherCondition: quarter[2].condition.text,
      windDir: quarter[2].wind_dir,
      tempFeels: Math.round(totalFeelsTemp / 6),
      degree: Math.round(totalTemp / 6),
      pressure: Math.round(totalPressure / 6),
      humidity: Math.round(totalHumidity / 6),
      wind: Math.round(totalWindSpeed / 6),
      visRange: Math.round(totalVisibilityRange / 6),
    };
  }

  const avgWeatherArr = [];

  // Split 'hour' array by the length of 6
  for (let i = 0; i < hour.length; i += 6) {
    avgWeatherArr.push(countAverageWeather(hour.slice(i, i + 6)));
  }

  // Return array of table rows
  return avgWeatherArr.map((avgWeather, i) =>
    createTableRow({ daypart: dayTime[i], ...avgWeather })
  );
}

// Generate slide with 1-hour forecast
function createHourSlide(time, src, degree, condition) {
  return $("<div class='slider--hour-item'></div>").append(
    $("<span></span>").text(new Date(time).toLocaleDateString().slice(0, -5)),

    new Date(time).toLocaleTimeString().slice(0, -3),

    $("<img width='32' height='32'>").attr("src", src).attr("title", condition),

    `${prettyTemperature(degree)}`
  );
}

// Generate slide with 1-day forecast
function createDaySlide(date, index, condition, maxTemp, minTemp) {
  const { text, icon } = condition;

  const daysOfWeek = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const formatOptions = { month: "short", day: "numeric" };

  date = new Date(date);
  const dayOfWeek = date.getDay();

  return $("<div></div>")
    .addClass("slider__days-slide")
    .append(
      $("<div class='slider__slide-day'></div>")
        .text(
          (index === 0 && "Сегодня") ||
            (index === 1 && "Завтра") ||
            daysOfWeek[dayOfWeek]
        )
        .addClass([0, 6].includes(dayOfWeek) ? "slider__day-holiday" : ""),

      $("<span class='slider__slide-date'></span>").text(
        date.toLocaleDateString(undefined, formatOptions).replace(".", "")
      ),

      $("<img width='64' height='64'>").attr("src", icon).attr("title", text),

      $(
        `<div class='slider__slide-temp'><span class='slider__slide-max'>${prettyTemperature(
          maxTemp
        )}</span></div>`
      ),

      $(
        `<div class='slider__slide-temp'><span class='slider__slide-min'>${prettyTemperature(
          minTemp
        )}</span></div>`
      ),

      $(`<p class='slider__slide-condition'>${text}</p>`)
    );
}

// Generate table row with 1-day forecast
function createTableRow({
  daypart,
  degree,
  imgSrc,
  weatherCondition,
  pressure,
  humidity,
  wind,
  windDir,
  visRange,
  tempFeels,
}) {
  return $("<tr></tr>").append(
    $(`<td class="weather__temp-wrapper">
          <div class="weather__table-daypart">${daypart}</div>
          <div class="weather__table-temp">${prettyTemperature(degree)}</div>
       </td>`),
    $(`<td class="weather__table-img">
          <img src="${imgSrc}" alt="" width="45" height="45" title="${weatherCondition}">
       </td>`),
    $(`<td class="weather__table-condition">
          ${weatherCondition}
       </td>`),
    $(`<td>
          ${pressure}
       </td>`),
    $(`<td>
          ${humidity}%
       </td>`),
    $(`<td>
          ${wind}, ${getWindDir(windDir)}
       </td>`),
    $(`<td>
          ${visRange}
       </td>`),
    $(`<td>
          ${prettyTemperature(tempFeels)}
       </td>`)
  );
}
