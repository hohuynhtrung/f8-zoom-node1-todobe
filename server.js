const http = require("node:http");
const jsonDB = require("./utils/jsonDB");

const allowOrigin = ["http://localhost:5173"];

const server = http.createServer((req, res) => {
  const rqOrigin = req.headers.origin;
  const validOrigin = allowOrigin.find((_origin) => _origin === rqOrigin);

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (validOrigin) {
    headers["Access-Control-Allow-Origin"] = validOrigin;
  }

  // Xử lý Preflight request
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  // [GET] /api/tasks
  if (req.method === "GET" && req.url === "/api/tasks") {
    const db = jsonDB.read();
    res.writeHead(200, headers);
    res.end(JSON.stringify(db.tasks));
    return;
  }

  // [POST] /api/tasks
  if (req.method === "POST" && req.url === "/api/tasks") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const title = (payload.title || "").trim();

        if (!title) {
          res.writeHead(400, headers);
          res.end(JSON.stringify({ message: "Title is required" }));
          return;
        }

        // Đọc DB và tính maxId mới mỗi lần tạo task, tránh trùng id
        const db = jsonDB.read();
        const maxId = db.tasks.reduce(
          (max, task) => (task.id > max ? task.id : max),
          0,
        );

        const newTask = {
          id: maxId + 1,
          title,
          isCompleted: false,
        };

        db.tasks.push(newTask);
        jsonDB.save(db);

        res.writeHead(201, headers);
        res.end(
          JSON.stringify({
            message: "Create task success",
            data: newTask,
          }),
        );
      } catch (error) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ message: "Invalid JSON body" }));
      }
    });

    return;
  }

  // [PUT] /api/tasks/:id
  if (req.method === "PUT" && req.url.startsWith("/api/tasks")) {
    const id = Number(req.url.split("/").pop());
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const db = jsonDB.read();
        const task = db.tasks.find((t) => t.id === id);

        if (!task) {
          res.writeHead(404, headers);
          res.end(JSON.stringify({ message: "Task not found" }));
          return;
        }

        if (payload.title !== undefined) task.title = payload.title;
        if (payload.isCompleted !== undefined)
          task.isCompleted = payload.isCompleted;

        jsonDB.save(db);

        res.writeHead(200, headers);
        res.end(JSON.stringify({ message: "Update success", data: task }));
      } catch (error) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ message: "Invalid JSON body" }));
      }
    });
    return;
  }

  // [DELETE] /api/tasks/:id
  if (req.method === "DELETE" && req.url.startsWith("/api/tasks/")) {
    const id = Number(req.url.split("/").pop());
    const db = jsonDB.read();
    const existed = db.tasks.some((task) => task.id === id);

    if (!existed) {
      res.writeHead(404, headers);
      res.end(
        JSON.stringify({
          message: "Task not found",
          id,
        }),
      );
      return;
    }

    db.tasks = db.tasks.filter((task) => task.id !== id);
    jsonDB.save(db);

    res.writeHead(200, headers);
    res.end(JSON.stringify({ message: "Delete success", id }));
    return;
  }

  //bypass-cors
  if (req.url.startsWith("/bypass-cors")) {
    const query = new URLSearchParams(req.url.split("?").pop());
    const originUrl = query.get("url");

    fetch(originUrl, {
      method: req.method,
    })
      .then((response) => {
        headers["Content-Type"] = response.headers.get("Content-Type");
        return response.text();
      })
      .then((result) => {
        res.writeHead(200, headers);
        res.end(result);
      });

    return;
  }

  // 404 not found
  res.writeHead(404, headers);
  res.end(JSON.stringify({ message: "Route not found" }));
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
