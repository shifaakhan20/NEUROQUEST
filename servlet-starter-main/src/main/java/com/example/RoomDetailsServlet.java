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

@WebServlet("/api/rooms")
public class RoomDetailsServlet extends HttpServlet {

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
            error.put("message", "Please log in to view rooms.");

            mapper.writeValue(response.getWriter(), error);
            return;
        }

        String sql =
            "SELECT room_number, room_name " +
            "FROM rooms ORDER BY room_number";

        try (Connection connection = DatabaseUtil.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql);
             ResultSet rs = statement.executeQuery()) {

            List<Map<String, Object>> rooms = new ArrayList<>();

            while (rs.next()) {
                Map<String, Object> room = new HashMap<>();
                room.put("roomNumber", rs.getInt("room_number"));
                room.put("roomName", rs.getString("room_name"));
                rooms.add(room);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("rooms", rooms);

            mapper.writeValue(response.getWriter(), result);

        } catch (Exception e) {
            getServletContext().log("Failed to load rooms.", e);

            if (!response.isCommitted()) {
                response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

                Map<String, Object> error = new HashMap<>();
                error.put("message", "Could not load rooms.");

                mapper.writeValue(response.getWriter(), error);
            }
        }
    }
}

