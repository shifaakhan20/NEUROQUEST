
package com.example;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

@WebServlet("/api/rooms/3/submit")
public class RoomThreeSubmitServlet extends HttpServlet {

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void doOptions(
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        CorsUtil.configure(request, response);
        response.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {

        CorsUtil.configure(request, response);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");

        HttpSession session = request.getSession(false);

        if (session == null || session.getAttribute("playerId") == null) {
            sendJson(response, HttpServletResponse.SC_UNAUTHORIZED,
                    Map.of("correct", false, "completed", false,
                            "message", "Please log in again."));
            return;
        }

        Integer playerId = (Integer) session.getAttribute("playerId");

        JsonNode body;
        try {
            body = mapper.readTree(request.getInputStream());
        } catch (Exception e) {
            sendJson(response, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("message", "Invalid JSON request."));
            return;
        }

        if (body == null || !body.path("answer").isTextual()
                || !body.path("stage").canConvertToInt()) {
            sendJson(response, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("message", "A valid stage and answer are required."));
            return;
        }

        int stage = body.path("stage").asInt();
        String answer = body.path("answer").asText().trim();

        if (stage < 1 || stage > 3 || answer.isEmpty()
                || answer.length() > 100) {
            sendJson(response, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("message", "Invalid stage or answer."));
            return;
        }

        String expectedAnswer;

        switch (stage) {
            case 1:
                expectedAnswer = "CODE";
                answer = answer.toUpperCase(java.util.Locale.ROOT);
                break;
            case 2:
                expectedAnswer = "9";
                break;
            case 3:
                expectedAnswer = "36";
                break;
            default:
                sendJson(response, HttpServletResponse.SC_BAD_REQUEST,
                        Map.of("message", "Invalid stage."));
                return;
        }

        boolean correct = expectedAnswer.equals(answer);

        try (Connection conn = DatabaseUtil.getConnection()) {
            conn.setAutoCommit(false);

            try {
                int roomId;

                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT room_id FROM rooms WHERE room_number = 3");
                     ResultSet rs = ps.executeQuery()) {

                    if (!rs.next()) {
                        conn.rollback();
                        sendJson(response,
                                HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                                Map.of("message", "Room 3 is missing."));
                        return;
                    }

                    roomId = rs.getInt("room_id");
                }

                // Keep a record of each submitted answer.
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO puzzle_results " +
                        "(player_id, room_id, is_correct) VALUES (?, ?, ?)")) {
                    ps.setInt(1, playerId);
                    ps.setInt(2, roomId);
                    ps.setBoolean(3, correct);
                    ps.executeUpdate();
                }

                if (correct && stage == 3) {
                    // Only the final correct stage completes Room 3.
                    try (PreparedStatement ps = conn.prepareStatement(
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

                conn.commit();

                Map<String, Object> result = new HashMap<>();
                result.put("correct", correct);
                result.put("completed", correct && stage == 3);
                result.put("stage", stage);
                result.put("message", !correct
                        ? "ACCESS DENIED. Try again."
                        : stage < 3
                        ? "SECURITY LAYER BYPASSED."
                        : "CORE OVERRIDE ACCEPTED. BREACH PROTOCOL COMPLETE!");

                sendJson(response, HttpServletResponse.SC_OK, result);

            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }

        } catch (Exception e) {
            getServletContext().log("Room 3 submission failed.", e);
            if (!response.isCommitted()) {
                sendJson(response,
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                        Map.of("message", "Could not submit the puzzle."));
            }
        }
    }

    private void sendJson(
            HttpServletResponse response,
            int status,
            Map<String, Object> data) throws IOException {
        response.setStatus(status);
        mapper.writeValue(response.getWriter(), data);
    }
}
