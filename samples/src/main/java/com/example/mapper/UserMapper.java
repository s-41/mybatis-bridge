package com.example.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;

/**
 * User Mapper Interface
 */
public interface UserMapper {

    List<User> findAll();

    User findById(@Param("id") Long id);

    void insert(User user);

    void update(User user);

    void deleteById(@Param("id") Long id);

    // このメソッドはXMLにマッピングがない
    List<User> findByName(String name);
}
