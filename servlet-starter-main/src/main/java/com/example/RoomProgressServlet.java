package com.example;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import com.fasterxml.jackson.databind.ObjectMapper;

@WebServlet("/api/rooms/progress")
public class RoomProgressServlet extends HttpServlet {

    private static final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void doOptions(HttpServletRequest request,
                             HttpServletResponse response)
            throws ServletException, IOException {
        CorsUtil.configure(request, response);
        response.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }

    @Override
    protected void doGet(HttpServletRequest request,
                         HttpServletResponse response)
            throws ServletException, IOException {

        CorsUtil.configure(request, response);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");

        HttpSession session = request.getSession(false);

        if (session == null || session.getAttribute("playerId") == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

            Map<String, Object> error = new HashMap<>();
            error.put("message", "Please log in to view room progress.");

            mapper.writeValue(response.getWriter(), error);
            return;
        }

        int playerId = (Integer) session.getAttribute("playerId");

        String sql =
            "SELECT r.room_number, r.room_name, " +
            "COALESCE(pp.completed, FALSE) AS completed " +
            "FROM rooms r " +
            "LEFT JOIN player_progress pp " +
            "ON r.room_id = pp.room_id AND pp.player_id = ? " +
            "ORDER BY r.room_number";

        try (Connection connection = DatabaseUtil.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, playerId);

            List<Map<String, Object>> rooms = new ArrayList<>();

            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> room = new HashMap<>();
                    room.put("roomNumber", rs.getInt("room_number"));
                    room.put("roomName", rs.getString("room_name"));
                    room.put("completed", rs.getBoolean("completed"));
                    rooms.add(room);
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("rooms", rooms);

            mapper.writeValue(response.getWriter(), result);

        } catch (Exception e) {
            getServletContext().log("Failed to load room progress.", e);

            if (!response.isCommitted()) {
                response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

                Map<String, Object> error = new HashMap<>();
                error.put("message", "Could not load room progress.");

                mapper.writeValue(response.getWriter(), error);
            }
        }
    }
}

