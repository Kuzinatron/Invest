function copyMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function roundSmallValues(value) {
  return Math.abs(value) < 1e-10 ? 0.0 : value;
}

function gaussMethod(matrix) {
  const m = matrix.length;
  const n = matrix[0].length - 1;

  const augmentedMatrix = copyMatrix(matrix);

  let currentRow = 0;
  let currentCol = 0;
  const pivotColumns = [];

  while (currentRow < m && currentCol < n) {
    let pivotRow = currentRow;
    let maxVal = Math.abs(augmentedMatrix[currentRow][currentCol]);

    for (let i = currentRow + 1; i < m; i++) {
      if (Math.abs(augmentedMatrix[i][currentCol]) > maxVal) {
        maxVal = Math.abs(augmentedMatrix[i][currentCol]);
        pivotRow = i;
      }
    }

    if (Math.abs(augmentedMatrix[pivotRow][currentCol]) < 1e-10) {
      currentCol++;
      continue;
    }

    if (pivotRow !== currentRow) {
      [augmentedMatrix[currentRow], augmentedMatrix[pivotRow]] = [
        augmentedMatrix[pivotRow],
        augmentedMatrix[currentRow],
      ];
    }

    pivotColumns.push(currentCol);

    const pivot = augmentedMatrix[currentRow][currentCol];
    for (let j = currentCol; j <= n; j++) {
      augmentedMatrix[currentRow][j] /= pivot;
    }

    for (let i = 0; i < m; i++) {
      if (i !== currentRow) {
        const factor = augmentedMatrix[i][currentCol];
        for (let j = currentCol; j <= n; j++) {
          augmentedMatrix[i][j] -= factor * augmentedMatrix[currentRow][j];
        }
      }
    }

    currentRow++;
    currentCol++;
  }

  const rankA = pivotColumns.length;
  let rankAb = rankA;

  for (let i = rankA; i < m; i++) {
    let allZero = true;
    for (let j = 0; j < n; j++) {
      if (Math.abs(augmentedMatrix[i][j]) > 1e-10) {
        allZero = false;
        break;
      }
    }

    if (allZero && Math.abs(augmentedMatrix[i][n]) > 1e-10) {
      return {
        solution: null,
        type: "inconsistent",
        rankA,
        rankAb: rankAb + 1,
        freeVariables: 0,
      };
    }

    if (!allZero) {
      rankAb++;
    }
  }

  let type;
  let freeVariables = 0;

  if (rankA < rankAb) {
    type = "inconsistent";
    freeVariables = 0;
  } else if (rankA === n) {
    type = "unique";
    freeVariables = 0;
  } else {
    type = "infinite";
    freeVariables = n - rankA;
  }

  if (type === "inconsistent") {
    return {
      solution: null,
      type,
      rankA,
      rankAb,
      freeVariables,
    };
  }

  const solution = new Array(n).fill(0);
  const isBasic = new Array(n).fill(false);

  pivotColumns.forEach((col) => {
    isBasic[col] = true;
  });

  for (let i = 0; i < m; i++) {
    let basicCol = -1;
    for (let j = 0; j < n; j++) {
      if (Math.abs(augmentedMatrix[i][j] - 1) < 1e-10) {
        basicCol = j;
        break;
      }
    }

    if (basicCol !== -1) {
      solution[basicCol] = augmentedMatrix[i][n];
    }
  }

  const freeVars = [];
  for (let j = 0; j < n; j++) {
    if (!isBasic[j]) {
      freeVars.push(j);
      solution[j] = 0;
    }
  }

  return {
    solution: solution.map(roundSmallValues),
    type,
    rankA,
    rankAb,
    freeVariables,
    freeVars,
    augmentedMatrix,
  };
}

function leastSquaresMethod(A, b) {
  const m = A.length;
  const n = A[0].length;

  const ATA = new Array(n);
  const ATb = new Array(n);

  for (let i = 0; i < n; i++) {
    ATA[i] = new Array(n).fill(0);
    ATb[i] = 0;

    for (let k = 0; k < m; k++) {
      for (let j = 0; j < n; j++) {
        ATA[i][j] += A[k][i] * A[k][j];
      }
      ATb[i] += A[k][i] * b[k];
    }
  }

  const augmentedMatrix = new Array(n);
  for (let i = 0; i < n; i++) {
    augmentedMatrix[i] = [...ATA[i], ATb[i]];
  }

  const result = gaussMethod(augmentedMatrix);

  if (result.type === "inconsistent") {
    throw new Error("Нормальная система несовместна");
  }

  const x = result.solution;

  const residual = computeResidual(A, x, b);
  const residualNorm = computeNorm(residual);

  const mse = (residualNorm * residualNorm) / m;

  return {
    solution: x,
    residual,
    residualNorm,
    mse,
    type: result.type,
    rankA: result.rankA,
    freeVariables: result.freeVariables,
  };
}

function computeResidual(A, x, b) {
  const m = A.length;
  const n = A[0].length;
  const r = new Array(m);

  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += A[i][j] * x[j];
    }
    r[i] = b[i] - sum; // b - A·x
  }

  return r.map(roundSmallValues);
}

function computeNorm(v) {
  let sum = 0;
  for (let val of v) {
    sum += val * val;
  }
  return Math.sqrt(sum);
}

function checkMatrixDimensions(matrix) {
  const m = matrix.length;
  if (m === 0) throw new Error("Пустая матрица");

  const n = matrix[0].length - 1;

  for (let i = 0; i < m; i++) {
    if (matrix[i].length !== n + 1) {
      throw new Error("Все строки должны иметь одинаковую длину");
    }
  }

  return { m, n };
}

function solveSystem(inputStr, method) {
  try {
    const lines = inputStr.trim().split("\n");
    const matrix = [];
    const A = [];
    const b = [];

    lines.forEach((line) => {
      const nums = line.trim().split(/\s+/).map(Number);
      if (nums.some(isNaN))
        throw new Error("Некорректные числа в строке: " + line);
      matrix.push([...nums]);
      b.push(nums.pop());
      A.push(nums);
    });

    const { m, n } = checkMatrixDimensions(matrix);

    if (m === 0 || n === 0) throw new Error("Некорректные размеры матрицы");

    let result;

    if (method === "gauss") {
      const gaussResult = gaussMethod(matrix);

      if (gaussResult.type === "inconsistent") {
        return {
          method: "gauss",
          solution: null,
          type: "inconsistent",
          status: "Система несовместна (нет решений)",
          matrix: matrix,
          A,
          b,
          residual: null,
          residualNorm: null,
        };
      }

      const residual = computeResidual(A, gaussResult.solution, b);
      const residualNorm = computeNorm(residual);

      result = {
        method: "gauss",
        solution: gaussResult.solution,
        type: gaussResult.type,
        status:
          gaussResult.type === "unique"
            ? "Система совместна (единственное решение)"
            : "Система совместна (бесконечно много решений)",
        matrix: matrix,
        A,
        b,
        residual,
        residualNorm,
      };
    } else if (method === "leastSquares") {
      const lsResult = leastSquaresMethod(A, b);

      result = {
        method: "leastSquares",
        solution: lsResult.solution,
        type: lsResult.type,
        status: "Решение методом наименьших квадратов",
        matrix: matrix,
        A,
        b,
        residual: lsResult.residual,
        residualNorm: lsResult.residualNorm,
      };
    }

    return result;
  } catch (error) {
    throw new Error("Ошибка решения: " + error.message);
  }
}

function insertForm() {
  const programSlideIndex = Array.from(
    document.querySelectorAll(".slide")
  ).findIndex((slide) =>
    slide.textContent.includes("Интерактивная программа решения СЛАУ")
  );

  if (programSlideIndex === -1) return;

  const programSlide = document.querySelectorAll(".slide")[programSlideIndex];

  const formHtml = `
    <div class="program-container">
      <h3>Интерактивное решение СЛАУ</h3>
      
      <p>Введите коэффициенты системы (последнее число в строке - свободный член):</p>
      
      <textarea id="sysInput" rows="6" cols="60">4 3 0 0 8
1 -3 0 0 8
-1 -7 8 13 5
4 1 9 18 4</textarea>
      
      <br><br>
      
      <select id="methodSelect">
        <option value="gauss">Метод Гаусса</option>
        <option value="leastSquares">Метод наименьших квадратов</option>
      </select>
      
      <br><br>
      
      <button id="solveBtn">Решить</button>
      <button id="clearBtn">Очистить</button>
      
      <br><br>
      
      <div id="result"></div>
    </div>
  `;

  programSlide.insertAdjacentHTML("beforeend", formHtml);

  programSlide.querySelector("#solveBtn").addEventListener("click", () => {
    const input = programSlide.querySelector("#sysInput").value;
    const method = programSlide.querySelector("#methodSelect").value;
    const resultDiv = programSlide.querySelector("#result");

    if (!input.trim()) {
      resultDiv.innerHTML = "Введите данные системы";
      return;
    }

    try {
      const result = solveSystem(input, method);
      let resultHTML = "";

      resultHTML += "<h4>РЕШЕНИЕ СИСТЕМЫ ЛИНЕЙНЫХ УРАВНЕНИЙ</h4>";
      resultHTML += `<p>Метод: ${
        method === "gauss" ? "ГАУССА" : "НАИМЕНЬШИХ КВАДРАТОВ"
      }</p>`;
      resultHTML += "<hr>";

      if (result.type === "inconsistent") {
        resultHTML +=
          "<p><strong>СИСТЕМА НЕСОВМЕСТНА (НЕТ РЕШЕНИЙ)</strong></p>";
      } else {
        resultHTML += "<p><strong>Система уравнений:</strong></p>";
        resultHTML += "\\[\\begin{cases} ";

        const equations = [];
        for (let i = 0; i < result.matrix.length; i++) {
          const row = result.matrix[i];
          let equation = "";
          let hasTerms = false;

          for (let j = 0; j < row.length - 1; j++) {
            const coeff = row[j];
            if (coeff !== 0) {
              if (equation !== "" && coeff > 0) equation += " + ";
              if (coeff < 0) equation += " - ";

              const absCoeff = Math.abs(coeff);
              if (absCoeff !== 1 || (absCoeff === 1 && j === row.length - 2)) {
                equation += absCoeff;
              }
              equation += "x_" + (j + 1);
              hasTerms = true;
            }
          }

          if (!hasTerms) {
            equation = "0";
          }

          equation += " = " + row[row.length - 1];
          equations.push(equation);
        }

        resultHTML += equations.join(" \\\\ ");
        resultHTML += " \\end{cases}\\]";
        resultHTML += "<br><br>";

        resultHTML += "<p><strong>Решение:</strong></p>";
        resultHTML += "\\[";

        const solutions = [];
        for (let i = 0; i < result.solution.length; i++) {
          solutions.push(
            "x_" + (i + 1) + " = " + result.solution[i].toFixed(4)
          );
        }

        resultHTML += solutions.join(", \\quad ");
        resultHTML += "\\]";
        resultHTML += "<br><br>";

        resultHTML += "<p><strong>Невязка (r = b - A·x):</strong></p>";
        resultHTML += "\\[";

        const residuals = [];
        for (let i = 0; i < result.residual.length; i++) {
          const residualValue = result.residual[i].toExponential(4);
          residuals.push("r_" + (i + 1) + " = " + residualValue);
        }

        resultHTML += residuals.join(", \\quad ");
        resultHTML += "\\]";
        resultHTML += "<br>";

        resultHTML += "<p><strong>Норма невязки:</strong> ";
        resultHTML += "\\[" + result.residualNorm.toExponential(4) + "\\]</p>";
      }

      resultDiv.innerHTML = resultHTML;

      renderMathInElement(resultDiv, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false,
      });
    } catch (error) {
      resultDiv.innerHTML = "Ошибка: " + error.message;
    }
  });

  programSlide.querySelector("#clearBtn").addEventListener("click", () => {
    programSlide.querySelector("#sysInput").value = "";
    programSlide.querySelector("#result").innerHTML = "";
  });
}
