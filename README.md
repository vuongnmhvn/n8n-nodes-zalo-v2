![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-zalo-api-v2
Node này được thiết kế để hoạt động độc lập và hoàn toàn bên trong instance n8n của bạn. Node mô phỏng hành vi trình duyệt để tương tác trực tiếp với Zalo Web. Điều này mang lại quy trình tự động hóa liền mạch mà không cần bất kỳ API của bên thứ ba hay phụ thuộc ngoại vi nào.

***Mình đã update lên API ZCA-JS V2 để hoạt động theo các tính năng mới***

## Buy me a coffee
Nếu ***node*** (hoặc thành phần/tính năng) này đã giúp bạn tiết kiệm thời gian đáng kể hoặc giải quyết được một vấn đề phức tạp, xin hãy xem xét việc ủng hộ bằng một ☕ Buy me a coffee hoặc đơn giản là nhấn ★ Star cho dự án trên GitHub (hoặc nền tảng tương ứng).

Sự khích lệ nhỏ bé từ bạn chính là nguồn động lực to lớn, tiếp thêm năng lượng để tôi không ngừng duy trì, cải tiến và phát triển thêm nhiều tính năng giá trị hơn nữa.

Chân thành cảm ơn sự hỗ trợ của bạn! 💛

![Alt text](qr-tech.png)
## Tác giả
- Nguyễn Minh Vượng
- Special thanks to @RFS-ADRENO

## Hướng dẫn cài đặt node này:

**Community Nodes (Khuyến nghị)**

Đối với người dùng n8n v0.187+, bạn có thể cài đặt node này trực tiếp từ bảng Community Nodes trong trình soạn thảo n8n.

1.  Mở trình soạn thảo n8n của bạn.
2.  Vào Settings > Community Nodes.
3.  Tìm kiếm "n8n-nodes-zalo-api-v2".
4.  Nhấp vào Install.
5.  Tải lại trình soạn thảo.

**Cài đặt thủ công**

Bạn cũng có thể cài đặt node này theo cách thủ công:

```
cd YOUR_N8N_INSTALLATION_DIRECTORY
npm install n8n-nodes-zalo-tools
```

## Available Nodes

1. Zalo Login By QR
Node cho phép đăng nhập vào Zalo thông qua mã QR.

2. Zalo Group
Node quản lý các hoạt động nhóm.
Operations:
createGroup: Tạo nhóm mới
getGroupInfo: Lấy thông tin nhóm
addGroupDeputy: Thêm phó nhóm
addUserToGroup: Thêm thành viên
changeGroupAvatar: Đổi avatar nhóm
changeGroupName: Đổi tên nhóm
getGroupMembers: Lấy danh sách thành viên
getAllGroups: Lấy tất cả nhóm
removeUserFromGroup: Xóa thành viên

3. Zalo User
Node quản lý người dùng và bạn bè.
Operations:
acceptFriendRequest: Chấp nhận lời mời kết bạn
sendFriendRequest: Gửi lời mời kết bạn
blockUser: Chặn người dùng
unblockUser: Bỏ chặn người dùng
changeAccountAvatar: Đổi ảnh đại diện
changeAccountSetting: Thay đổi cài đặt tài khoản
getUserInfo: Lấy thông tin người dùng
getAllFriends: Lấy danh sách bạn bè
findUser: Tìm kiếm người dùng qua số điện thoại

4. Zalo Send Message
Node gửi tin nhắn tới người dùng hoặc nhóm.
Features:
Gửi tin nhắn văn bản


5. Zalo Message Trigger
Node lắng nghe và xử lý các sự kiện tin nhắn.
Events:
Tin nhắn mới
Tin nhắn nhóm
Thay đổi trạng thái tin nhắn

## Warning and Thanks

**Please read this carefully before using the Zalo nodes:**

Lưu ý: việc sử dụng thư viện này đồng nghĩa với việc bạn đang làm trái với chính sách của Zalo và nó có thể khiến cho tài khoản của bạn bị vô hiệu hóa. Chúng tôi sẽ không chịu trách nhiệm nếu điều đó xảy ra, vậy nên hãy cân nhắc trước khi sử dụng.

We would like to thank ZCA-JS for their work on this library.


## License

[MIT](https://github.com/n8n-io/n8n-nodes-starter/blob/master/LICENSE.md)
