package com.example;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@WebServlet("/api/rooms/1/submit")
public class RoomOneSubmitServlet extends HttpServlet {

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
            sendJson(response, HttpServletResponse.SC_UNAUTHORIZED,
                    Map.of(
                        "correct", false,
                        "completed", false,
                        "message", "Please log in again."
                    ));
            return;
        }

        int playerId = (Integer) session.getAttribute("playerId");

        JsonNode body;
        try {
            body = mapper.readTree(request.getInputStream());
        } catch (Exception e) {
            sendJson(response, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("message", "Invalid JSON request."));
            return;
        }

        JsonNode answerNode = body == null ? null : body.get("answer");

        if (answerNode == null || !answerNode.isTextual()) {
            sendJson(response, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("message", "Please submit a valid answer."));
            return;
        }

        String answer = answerNode.asText().trim();
        boolean correct = "30".equals(answer);

        try (Connection connection = DatabaseUtil.getConnection()) {

            connection.setAutoCommit(false);

            try {
                int roomId;

                try (PreparedStatement ps = connection.prepareStatement(
                        "SELECT room_id FROM rooms WHERE room_number = ?")) {
                    ps.setInt(1, 1);

                    try (ResultSet rs = ps.executeQuery()) {
                        if (!rs.next()) {
                            connection.rollback();
                            sendJson(response,
                                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                                    Map.of("message", "Room configuration error."));
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
                        ? "Access granted. Room 1 completed!"
                        : "Incorrect answer. Try again.");

                sendJson(response, HttpServletResponse.SC_OK, result);

            } catch (SQLException e) {
                try {
                    connection.rollback();
                } catch (SQLException rollbackError) {
                    e.addSuppressed(rollbackError);
                }
                throw e;
            }

        } catch (SQLException e) {
            getServletContext().log("Room 1 submission failed.", e);

            sendJson(response,
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
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
