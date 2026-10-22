package com.example;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@WebServlet("/api/rooms/2/submit")
public class RoomTwoSubmitServlet extends HttpServlet {

    private static final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void doOptions(HttpServletRequest request,
                             HttpServletResponse response)
            throws ServletException, IOException {
        CorsUtil.configure(request, response);
        response.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }

    @Override
    protected void doPost(HttpServletRequest request,
                          HttpServletResponse response)
            throws ServletException, IOException {

        CorsUtil.configure(request, response);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");

        HttpSession session = request.getSession(false);

        if (session == null || session.getAttribute("playerId") == null) {
            sendJson(response, 401,
                    Map.of("correct", false,
                           "completed", false,
                           "message", "Please log in again."));
            return;
        }

        int playerId = (Integer) session.getAttribute("playerId");

        JsonNode body;
        try {
            body = mapper.readTree(request.getInputStream());
        } catch (Exception e) {
            sendJson(response, 400,
                    Map.of("message", "Invalid JSON request."));
            return;
        }

        JsonNode queens = body == null ? null : body.get("queens");

        if (queens == null || !queens.isArray()
                || queens.size() != 5) {
            sendJson(response, 400,
                    Map.of("message", "Submit exactly five queens."));
            return;
        }

        Set<Integer> rows = new HashSet<>();
        Set<Integer> cols = new HashSet<>();
        boolean correct = true;
        int[] positions = new int[5];

        for (JsonNode queen : queens) {
            if (!queen.has("row") || !queen.has("col")
                    || !queen.get("row").canConvertToInt()
                    || !queen.get("col").canConvertToInt()) {
                sendJson(response, 400,
                        Map.of("message", "Invalid queen coordinates."));
                return;
            }

            int row = queen.get("row").asInt();
            int col = queen.get("col").asInt();

            if (row < 0 || row >= 5 || col < 0 || col >= 5
                    || !rows.add(row)) {
                sendJson(response, 400,
                        Map.of("message", "Invalid queen positions."));
                return;
            }

            positions[row] = col;
        }

        if (rows.size() != 5) {
            sendJson(response, 400,
                    Map.of("message", "Every row needs one queen."));
            return;
        }

        for (int row1 = 0; row1 < 5; row1++) {
            for (int row2 = row1 + 1; row2 < 5; row2++) {
                if (positions[row1] == positions[row2]
                        || Math.abs(positions[row1] - positions[row2])
                           == Math.abs(row1 - row2)) {
                    correct = false;
                }
            }
        }

        try (Connection connection = DatabaseUtil.getConnection()) {
            connection.setAutoCommit(false);

            try {
                int roomId;

                try (PreparedStatement ps = connection.prepareStatement(
                        "SELECT room_id FROM rooms WHERE room_number = ?")) {
                    ps.setInt(1, 2);

                    try (ResultSet rs = ps.executeQuery()) {
                        if (!rs.next()) {
                            connection.rollback();
                            sendJson(response, 500,
                                    Map.of("message",
                                           "Room 2 is not configured in the database."));
                            return;
                        }
                        roomId = rs.getInt("room_id");
                    }
                }

                try (PreparedStatement ps = connection.prepareStatement(
                        "INSERT INTO puzzle_results " +
                        "(player_id, room_id, is_correct) VALUES (?, ?, ?)")) {
                    ps.setInt(1, playerId);
                    ps.setInt(2, roomId);
                    ps.setBoolean(3, correct);
                    ps.executeUpdate();
                }

                if (correct) {
                    try (PreparedStatement ps = connection.prepareStatement(
                            "INSERT INTO player_progress " +
                            "(player_id, room_id, completed, completed_at) " +
                            "VALUES (?, ?, TRUE, CURRENT_TIMESTAMP) " +
                            "ON DUPLICATE KEY UPDATE " +
                            "completed = TRUE, completed_at = CURRENT_TIMESTAMP")) {
                        ps.setInt(1, playerId);
                        ps.setInt(2, roomId);
                        ps.executeUpdate();
                    }
                }

                connection.commit();

                Map<String, Object> result = new HashMap<>();
                result.put("correct", correct);
                result.put("completed", correct);
                result.put("message", correct
                        ? "Access granted. Room 2 completed!"
                        : "Incorrect arrangement. Try again.");

                sendJson(response, 200, result);

            } catch (SQLException e) {
                try {
                    connection.rollback();
                } catch (SQLException rollbackError) {
                    e.addSuppressed(rollbackError);
                }
                throw e;
            }

        } catch (SQLException e) {
            getServletContext().log("Room 2 submission failed.", e);
            sendJson(response, 500,
                    Map.of("message", "Could not save your answer."));
        }
    }

    private void sendJson(HttpServletResponse response,
                          int status,
                          Map<String, Object> data) throws IOException {
        response.setStatus(status);
        mapper.writeValue(response.getWriter(), data);
    }
}

