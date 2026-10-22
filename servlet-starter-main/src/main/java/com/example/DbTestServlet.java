package com.example;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

@WebServlet("/api/db-test")
public class DbTestServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        response.setHeader(
                "Access-Control-Allow-Origin",
                "http://localhost:5173");

        String sql = "SELECT room_number, room_name FROM rooms "
                + "WHERE room_number = ?";

        try (Connection connection = DatabaseUtil.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, 1);

            try (ResultSet result = statement.executeQuery()) {

                if (result.next()) {
                    int roomNumber = result.getInt("room_number");
                    String roomName = result.getString("room_name");

                    response.getWriter().printf(
                            "{\"status\":\"success\","
                                    + "\"message\":\"MySQL connected!\","
                                    + "\"roomNumber\":%d,"
                                    + "\"roomName\":\"%s\"}",
                            roomNumber,
                            roomName);
                } else {
                    response.setStatus(
                            HttpServletResponse.SC_NOT_FOUND);
                    response.getWriter().print(
                            "{\"status\":\"error\","
                                    + "\"message\":\"Room One not found\"}");
                }
            }

        } catch (SQLException e) {
            e.printStackTrace();
            getServletContext().log(
                    "NEUROQUEST database connection failed", e);

            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().print(
                    "{\"status\":\"error\","
                            + "\"message\":\"Database connection failed: "
                            + e.toString().replace("\"", "'") + "\"}");
        } catch (Exception e) {
            e.printStackTrace();
            getServletContext().log(
                    "NEUROQUEST unexpected error", e);

            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().print(
                    "{\"status\":\"error\","
                            + "\"message\":\"Failed: "
                            + e.toString().replace("\"", "'") + "\"}");
        }
    }
}